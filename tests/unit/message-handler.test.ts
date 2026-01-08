import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { ConfigManager } from '../../src/config/config-manager.js';
import { ToolFilter } from '../../src/filter/tool-filter.js';
import { MessageHandler, type JsonRpcRequest, type JsonRpcResponse } from '../../src/proxy/message-handler.js';

describe('MessageHandler', () => {
  let tempDir: string;
  let configManager: ConfigManager;
  let toolFilter: ToolFilter;
  let messageHandler: MessageHandler;
  const serverKey = 'test-server@1.0.0';

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcproxy-test-'));
    configManager = new ConfigManager(tempDir);
    configManager.setServerKey({ name: 'test-server', version: '1.0.0' });
    toolFilter = new ToolFilter(configManager);
    messageHandler = new MessageHandler(toolFilter, configManager);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('handleDownstreamRequest', () => {
    it('should pass through tools/list requests', async () => {
      await configManager.load();

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      };

      const result = messageHandler.handleDownstreamRequest(request);

      expect(result).toEqual(request);
    });

    it('should pass through enabled tool calls', async () => {
      const config = {
        version: '1.0',
        servers: {
          [serverKey]: { tools: { read_file: true } },
        },
      };
      await fs.writeFile(
        path.join(tempDir, '.mcproxy.json'),
        JSON.stringify(config)
      );
      await configManager.load();

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'read_file', arguments: {} },
      };

      const result = messageHandler.handleDownstreamRequest(request);

      expect(result).toEqual(request);
    });

    it('should block disabled tool calls', async () => {
      const config = {
        version: '1.0',
        servers: {
          [serverKey]: { tools: { delete_file: false } },
        },
      };
      await fs.writeFile(
        path.join(tempDir, '.mcproxy.json'),
        JSON.stringify(config)
      );
      await configManager.load();

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'delete_file', arguments: {} },
      };

      const result = messageHandler.handleDownstreamRequest(request);

      expect('error' in result).toBe(true);
      expect((result as JsonRpcResponse).error?.code).toBe(-32601);
      expect((result as JsonRpcResponse).error?.message).toContain('disabled');
    });
  });

  describe('handleUpstreamResponse', () => {
    it('should filter tools/list response', async () => {
      const config = {
        version: '1.0',
        servers: {
          [serverKey]: { tools: { tool_a: true, tool_b: false } },
        },
      };
      await fs.writeFile(
        path.join(tempDir, '.mcproxy.json'),
        JSON.stringify(config)
      );
      await configManager.load();

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      };
      messageHandler.handleDownstreamRequest(request);

      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          tools: [
            { name: 'tool_a', description: 'Tool A' },
            { name: 'tool_b', description: 'Tool B' },
          ],
        },
      };

      const result = await messageHandler.handleUpstreamResponse(response);

      expect((result.result as { tools: unknown[] }).tools).toHaveLength(1);
      expect((result.result as { tools: { name: string }[] }).tools[0].name).toBe('tool_a');
    });
  });
});

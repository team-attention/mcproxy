import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { ConfigManager } from '../../src/config/config-manager.js';
import { ToolFilter } from '../../src/filter/tool-filter.js';

describe('ToolFilter', () => {
  let tempDir: string;
  let configManager: ConfigManager;
  let toolFilter: ToolFilter;
  const serverKey = 'test-server@1.0.0';

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcproxy-test-'));
    configManager = new ConfigManager(tempDir);
    configManager.setServerKey({ name: 'test-server', version: '1.0.0' });
    toolFilter = new ToolFilter(configManager);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('isEnabled', () => {
    it('should return true for enabled tools', async () => {
      const config = {
        version: '1.0',
        servers: {
          [serverKey]: { tools: { tool_a: true } },
        },
      };
      await fs.writeFile(
        path.join(tempDir, '.mcproxy.json'),
        JSON.stringify(config)
      );
      await configManager.load();

      expect(toolFilter.isEnabled('tool_a')).toBe(true);
    });

    it('should return false for disabled tools', async () => {
      const config = {
        version: '1.0',
        servers: {
          [serverKey]: { tools: { tool_a: false } },
        },
      };
      await fs.writeFile(
        path.join(tempDir, '.mcproxy.json'),
        JSON.stringify(config)
      );
      await configManager.load();

      expect(toolFilter.isEnabled('tool_a')).toBe(false);
    });
  });

  describe('filterTools', () => {
    it('should filter out disabled tools', async () => {
      const config = {
        version: '1.0',
        servers: {
          [serverKey]: {
            tools: { tool_a: true, tool_b: false, tool_c: true },
          },
        },
      };
      await fs.writeFile(
        path.join(tempDir, '.mcproxy.json'),
        JSON.stringify(config)
      );
      await configManager.load();

      const tools = [
        { name: 'tool_a', description: 'Tool A' },
        { name: 'tool_b', description: 'Tool B' },
        { name: 'tool_c', description: 'Tool C' },
      ];

      const filtered = toolFilter.filterTools(tools);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((t) => t.name)).toEqual(['tool_a', 'tool_c']);
    });

    it('should include unknown tools (default true)', async () => {
      await configManager.load();

      const tools = [{ name: 'unknown_tool', description: 'Unknown Tool' }];

      const filtered = toolFilter.filterTools(tools);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('unknown_tool');
    });
  });
});

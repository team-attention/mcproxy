import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { ConfigManager } from '../../src/config/config-manager.js';

describe('ConfigManager', () => {
  let tempDir: string;
  let configManager: ConfigManager;
  const serverKey = 'test-server@1.0.0';

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcproxy-test-'));
    configManager = new ConfigManager(tempDir);
    configManager.setServerKey({ name: 'test-server', version: '1.0.0' });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('load', () => {
    it('should create default config when file does not exist', async () => {
      const config = await configManager.load();

      expect(config.version).toBe('1.0');
      expect(config.servers).toEqual({});
    });

    it('should load existing config', async () => {
      const existingConfig = {
        version: '1.0',
        servers: {
          [serverKey]: {
            tools: { tool_a: true, tool_b: false },
          },
        },
      };
      await fs.writeFile(
        path.join(tempDir, '.mcproxy.json'),
        JSON.stringify(existingConfig)
      );

      const config = await configManager.load();

      expect(config.servers[serverKey].tools).toEqual({
        tool_a: true,
        tool_b: false,
      });
    });
  });

  describe('syncNewTools', () => {
    it('should add new tools with enabled=true by default', async () => {
      await configManager.load();

      await configManager.syncNewTools([
        { name: 'new_tool', description: 'A new tool' },
      ]);

      expect(configManager.isToolEnabled('new_tool')).toBe(true);
    });

    it('should not overwrite existing tool settings', async () => {
      const existingConfig = {
        version: '1.0',
        servers: {
          [serverKey]: {
            tools: { existing_tool: false },
          },
        },
      };
      await fs.writeFile(
        path.join(tempDir, '.mcproxy.json'),
        JSON.stringify(existingConfig)
      );
      await configManager.load();

      await configManager.syncNewTools([
        { name: 'existing_tool', description: 'An existing tool' },
        { name: 'new_tool', description: 'A new tool' },
      ]);

      expect(configManager.isToolEnabled('existing_tool')).toBe(false);
      expect(configManager.isToolEnabled('new_tool')).toBe(true);
    });
  });

  describe('isToolEnabled', () => {
    it('should return true for unknown tools', async () => {
      await configManager.load();

      expect(configManager.isToolEnabled('unknown_tool')).toBe(true);
    });

    it('should return the configured value', async () => {
      const existingConfig = {
        version: '1.0',
        servers: {
          [serverKey]: {
            tools: { enabled_tool: true, disabled_tool: false },
          },
        },
      };
      await fs.writeFile(
        path.join(tempDir, '.mcproxy.json'),
        JSON.stringify(existingConfig)
      );
      await configManager.load();

      expect(configManager.isToolEnabled('enabled_tool')).toBe(true);
      expect(configManager.isToolEnabled('disabled_tool')).toBe(false);
    });
  });
});

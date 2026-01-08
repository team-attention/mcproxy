import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { McpProxyConfigSchema, type McpProxyConfig, type ServerToolConfig } from './config-schema.js';
import { log } from '../utils/logger.js';
import { withFileLock } from '../utils/file-lock.js';

export interface Tool {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

export interface ServerInfo {
  name: string;
  version?: string;
}

export class ConfigManager {
  private config: McpProxyConfig;
  private configPath: string;
  private serverKey: string | null = null;

  constructor(workspaceRoot: string) {
    this.configPath = path.join(workspaceRoot, '.mcproxy.json');
    this.config = { version: '1.0', servers: {} };
  }

  setServerKey(serverInfo: ServerInfo): void {
    this.serverKey = serverInfo.version
      ? `${serverInfo.name}@${serverInfo.version}`
      : serverInfo.name;
    log('Server key set:', this.serverKey);
  }

  getServerKey(): string | null {
    return this.serverKey;
  }

  async load(): Promise<McpProxyConfig> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      const parsed = JSON.parse(content);
      this.config = McpProxyConfigSchema.parse(parsed);
      log('Loaded config from', this.configPath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        log('Config file not found, using default');
        this.config = { version: '1.0', servers: {} };
      } else {
        throw err;
      }
    }
    return this.config;
  }

  async save(): Promise<void> {
    await fs.writeFile(
      this.configPath,
      JSON.stringify(this.config, null, 2),
      'utf-8'
    );
    log('Saved config to', this.configPath);
  }

  async syncNewTools(tools: Tool[]): Promise<void> {
    if (!this.serverKey) {
      log('Server key not set, skipping sync');
      return;
    }

    await withFileLock(this.configPath, async () => {
      // 최신 파일 다시 읽기 (다른 프로세스가 수정했을 수 있음)
      await this.load();

      const serverConfig = this.getServerConfig();
      let updated = false;

      for (const tool of tools) {
        if (!(tool.name in serverConfig.tools)) {
          serverConfig.tools[tool.name] = true;
          updated = true;
          log('Added new tool:', tool.name);
        }
      }

      if (updated) {
        await this.save();
      }
    });
  }

  isToolEnabled(toolName: string): boolean {
    if (!this.serverKey) {
      return true;
    }
    const serverConfig = this.config.servers[this.serverKey];
    if (!serverConfig) {
      return true;
    }
    return serverConfig.tools[toolName] ?? true;
  }

  getEnabledTools(): string[] {
    if (!this.serverKey) {
      return [];
    }
    const serverConfig = this.config.servers[this.serverKey];
    if (!serverConfig) {
      return [];
    }
    return Object.entries(serverConfig.tools)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name);
  }

  getDisabledTools(): string[] {
    if (!this.serverKey) {
      return [];
    }
    const serverConfig = this.config.servers[this.serverKey];
    if (!serverConfig) {
      return [];
    }
    return Object.entries(serverConfig.tools)
      .filter(([_, enabled]) => !enabled)
      .map(([name]) => name);
  }

  private getServerConfig(): ServerToolConfig {
    if (!this.serverKey) {
      throw new Error('Server key not set');
    }
    if (!this.config.servers[this.serverKey]) {
      this.config.servers[this.serverKey] = { tools: {} };
    }
    return this.config.servers[this.serverKey];
  }
}

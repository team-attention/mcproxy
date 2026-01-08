import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { log } from '../utils/logger.js';

interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface McpConfig {
  mcpServers: Record<string, McpServerConfig>;
}

export async function findServerName(
  workspaceRoot: string,
  upstreamCommand: string,
  upstreamArgs: string[]
): Promise<string> {
  const mcpConfigPath = path.join(workspaceRoot, '.mcp.json');

  try {
    const content = await fs.readFile(mcpConfigPath, 'utf-8');
    const config: McpConfig = JSON.parse(content);

    const upstreamFull = [upstreamCommand, ...upstreamArgs].join(' ');

    for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
      const args = serverConfig.args || [];
      const dashDashIndex = args.indexOf('--');

      if (dashDashIndex === -1) {
        continue;
      }

      const upstreamPart = args.slice(dashDashIndex + 1);
      const upstreamPartFull = upstreamPart.join(' ');

      if (upstreamPartFull === upstreamFull) {
        log('Found server name from .mcp.json:', serverName);
        return serverName;
      }
    }

    log('No matching server found in .mcp.json, using command as key');
  } catch (err) {
    log('Could not read .mcp.json:', (err as Error).message);
  }

  return [upstreamCommand, ...upstreamArgs].join(' ');
}

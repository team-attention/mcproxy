#!/usr/bin/env node
import { program } from 'commander';
import { McpProxy } from './proxy/mcp-proxy.js';
import { error } from './utils/logger.js';

program
  .name('mcproxy')
  .description('MCP Proxy with tool filtering for Claude Code')
  .version('0.1.0')
  .option('--config <path>', 'Path to workspace root for .mcproxy.json', process.cwd())
  .argument('<command...>', 'Upstream MCP server command and arguments (after --)')
  .action(async (command: string[], options: { config: string }) => {
    const [upstreamCommand, ...upstreamArgs] = command;

    if (!upstreamCommand) {
      error('No upstream command specified');
      process.exit(1);
    }

    const proxy = new McpProxy({
      upstreamCommand,
      upstreamArgs,
      configPath: options.config,
    });

    try {
      await proxy.start();
    } catch (err) {
      error('Failed to start proxy:', err);
      process.exit(1);
    }
  });

program.parse();

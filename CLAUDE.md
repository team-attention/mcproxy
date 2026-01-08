# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP Proxy for Claude Code - intercepts MCP server requests and filters tools based on `.mcproxy.json` configuration. Allows users to enable/disable specific MCP tools to reduce token consumption.

## Commands

```bash
npm run build      # Compile TypeScript to dist/
npm test           # Run tests in watch mode
npm test -- --run  # Run tests once
npm run dev        # Run with tsx (development)
```

## Architecture

**Message Flow:**
```
Claude Code ←→ mcproxy (stdio) ←→ MCP Server (subprocess)
                  ↓
            .mcproxy.json (tool config)
```

**Key Modules:**
- `src/index.ts` - CLI entry point using Commander
- `src/proxy/mcp-proxy.ts` - Main proxy class, manages upstream subprocess and stdio streams
- `src/proxy/message-handler.ts` - Intercepts `tools/list` (filters response) and `tools/call` (blocks disabled tools)
- `src/config/config-manager.ts` - Manages `.mcproxy.json` file, auto-registers new tools with `enabled: true`
- `src/config/mcp-config-reader.ts` - Reads `.mcp.json` to auto-detect server name for config keys
- `src/filter/tool-filter.ts` - Simple filter logic using ConfigManager

**Server Name Resolution:**
The proxy reads `.mcp.json` to find which server name (e.g., "linear", "github") matches the current upstream command, then uses that as the key in `.mcproxy.json`.

## File Naming

Use kebab-case for all TypeScript files (e.g., `mcp-proxy.ts`, `config-manager.ts`).

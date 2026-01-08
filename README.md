# mcproxy

MCP Proxy with tool filtering for Claude Code. Intercepts MCP server requests and filters tools based on configuration to reduce token consumption.

## Installation

```bash
# Run directly with npx
npx mcproxy <upstream-command>

# Or install globally
npm install -g mcproxy
```

## Usage

### Basic Usage

Wrap your MCP server command with mcproxy:

```bash
mcproxy npx -y @modelcontextprotocol/server-filesystem /path/to/dir
```

### With Claude Code (.mcp.json)

Configure your `.mcp.json` to use mcproxy as a wrapper:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y", "mcproxy",
        "--",
        "npx", "-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"
      ]
    },
    "linear": {
      "command": "npx",
      "args": [
        "-y", "mcproxy",
        "--",
        "npx", "-y", "mcp-remote", "https://mcp.linear.app/mcp",
        "--header", "Authorization: Bearer ${LINEAR_API_KEY}"
      ]
    }
  }
}
```

## Configuration

mcproxy automatically creates a `.mcproxy.json` file to manage tool settings:

```json
{
  "version": "1.0",
  "servers": {
    "linear-mcp@1.0.0": {
      "tools": {
        "list_issues": true,
        "create_issue": true,
        "delete_issue": false
      }
    }
  }
}
```

- Tools are auto-registered on first use with `enabled: true`
- Set a tool to `false` to disable it
- Server key is derived from `serverInfo.name@version` in MCP initialize response

## How It Works

```
Claude Code <-> mcproxy (stdio) <-> MCP Server (subprocess)
                    |
              .mcproxy.json (tool config)
```

1. mcproxy intercepts the MCP `initialize` response to get server name
2. On `tools/list` response, it filters out disabled tools
3. On `tools/call` request, it blocks disabled tool calls

## Options

```
--config <path>  Path to workspace root for .mcproxy.json (default: current directory)
```

## Debugging

Set `DEBUG=1` to enable verbose logging:

```bash
DEBUG=1 mcproxy npx -y @some/mcp-server
```

## License

MIT

#!/usr/bin/env node
const readline = require('readline');

const tools = [
  { name: 'read_file', description: 'Read a file from the filesystem' },
  { name: 'write_file', description: 'Write content to a file' },
  { name: 'delete_file', description: 'Delete a file from the filesystem' },
  { name: 'list_directory', description: 'List files in a directory' },
];

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on('line', (line) => {
  try {
    const request = JSON.parse(line);
    const response = handleRequest(request);
    console.log(JSON.stringify(response));
  } catch (err) {
    console.error('Mock server error:', err.message);
  }
});

function handleRequest(request) {
  const { id, method, params } = request;

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'mock-server', version: '1.0.0' },
        },
      };

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: { tools },
      };

    case 'tools/call':
      const toolName = params?.name;
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            { type: 'text', text: `Mock result from tool: ${toolName}` },
          ],
        },
      };

    default:
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      };
  }
}

import type { ConfigManager, Tool } from '../config/config-manager.js';
import type { ToolFilter } from '../filter/tool-filter.js';
import { ToolDisabledError } from '../utils/errors.js';
import { log } from '../utils/logger.js';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

export type JsonRpcMessage = JsonRpcRequest | JsonRpcResponse | JsonRpcNotification;

function isRequest(msg: JsonRpcMessage): msg is JsonRpcRequest {
  return 'method' in msg && 'id' in msg;
}

function isResponse(msg: JsonRpcMessage): msg is JsonRpcResponse {
  return ('result' in msg || 'error' in msg) && !('method' in msg);
}

export class MessageHandler {
  private pendingRequests = new Map<string | number, JsonRpcRequest>();

  constructor(
    private toolFilter: ToolFilter,
    private configManager: ConfigManager
  ) {}

  handleDownstreamRequest(message: JsonRpcRequest): JsonRpcRequest | JsonRpcResponse {
    log('Downstream request:', message.method);

    if (message.method === 'tools/call') {
      const params = message.params as { name?: string } | undefined;
      const toolName = params?.name;

      if (toolName && !this.toolFilter.isEnabled(toolName)) {
        log('Blocking disabled tool:', toolName);
        const error = new ToolDisabledError(toolName);
        return {
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: error.code,
            message: error.message,
            data: error.data,
          },
        };
      }
    }

    if (message.method === 'tools/list') {
      this.pendingRequests.set(message.id, message);
    }

    return message;
  }

  async handleUpstreamResponse(response: JsonRpcResponse): Promise<JsonRpcResponse> {
    const originalRequest = this.pendingRequests.get(response.id as string | number);

    if (originalRequest?.method === 'tools/list' && response.result) {
      this.pendingRequests.delete(response.id as string | number);
      return this.filterToolsListResponse(response);
    }

    return response;
  }

  private async filterToolsListResponse(response: JsonRpcResponse): Promise<JsonRpcResponse> {
    const result = response.result as { tools?: Tool[] };
    const tools = result?.tools || [];

    await this.configManager.syncNewTools(tools);

    const filteredTools = this.toolFilter.filterTools(tools);
    log(`Filtered tools: ${filteredTools.length}/${tools.length}`);

    return {
      ...response,
      result: { ...result, tools: filteredTools },
    };
  }

  passThrough(message: JsonRpcMessage): JsonRpcMessage {
    return message;
  }
}

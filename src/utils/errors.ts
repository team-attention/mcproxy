export class McpProxyError extends Error {
  constructor(
    message: string,
    public code: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'McpProxyError';
  }
}

export class ToolDisabledError extends McpProxyError {
  constructor(toolName: string) {
    super(`Tool '${toolName}' is disabled`, -32601, { toolName });
    this.name = 'ToolDisabledError';
  }
}

export class UpstreamConnectionError extends McpProxyError {
  constructor(serverKey: string, cause?: Error) {
    super(
      `Failed to connect to upstream server`,
      -32603,
      { serverKey, cause: cause?.message }
    );
    this.name = 'UpstreamConnectionError';
  }
}

export class ConfigValidationError extends McpProxyError {
  constructor(details: string) {
    super(`Invalid configuration: ${details}`, -32602, { details });
    this.name = 'ConfigValidationError';
  }
}

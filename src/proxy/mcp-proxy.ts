import { spawn, type ChildProcess } from 'node:child_process';
import * as readline from 'node:readline';
import { ConfigManager } from '../config/config-manager.js';
import { ToolFilter } from '../filter/tool-filter.js';
import { MessageHandler, type JsonRpcMessage, type JsonRpcRequest, type JsonRpcResponse } from './message-handler.js';
import { UpstreamConnectionError } from '../utils/errors.js';
import { log, error } from '../utils/logger.js';

export interface McpProxyOptions {
  upstreamCommand: string;
  upstreamArgs: string[];
  upstreamEnv?: Record<string, string>;
  configPath: string;
}

export class McpProxy {
  private upstream: ChildProcess | null = null;
  private configManager: ConfigManager;
  private toolFilter: ToolFilter;
  private messageHandler: MessageHandler;
  private upstreamReader: readline.Interface | null = null;

  constructor(private options: McpProxyOptions) {
    this.configManager = new ConfigManager(options.configPath);
    this.toolFilter = new ToolFilter(this.configManager);
    this.messageHandler = new MessageHandler(this.toolFilter, this.configManager);
  }

  async start(): Promise<void> {
    log('Starting MCP Proxy');

    await this.configManager.load();

    this.startUpstream();
    this.setupDownstream();

    log('MCP Proxy started');
  }

  private startUpstream(): void {
    const { upstreamCommand, upstreamArgs, upstreamEnv } = this.options;

    log('Starting upstream:', upstreamCommand, upstreamArgs.join(' '));

    this.upstream = spawn(upstreamCommand, upstreamArgs, {
      stdio: ['pipe', 'pipe', 'inherit'],
      env: { ...process.env, ...upstreamEnv },
    });

    this.upstream.on('error', (err) => {
      error('Upstream process error:', err.message);
      throw new UpstreamConnectionError(upstreamCommand, err);
    });

    this.upstream.on('exit', (code, signal) => {
      log('Upstream process exited:', code, signal);
      process.exit(code ?? 1);
    });

    if (!this.upstream.stdout) {
      throw new UpstreamConnectionError(upstreamCommand, new Error('No stdout'));
    }

    this.upstreamReader = readline.createInterface({
      input: this.upstream.stdout,
      crlfDelay: Infinity,
    });

    this.upstreamReader.on('line', (line) => {
      this.handleUpstreamMessage(line);
    });
  }

  private setupDownstream(): void {
    const downstreamReader = readline.createInterface({
      input: process.stdin,
      crlfDelay: Infinity,
    });

    downstreamReader.on('line', (line) => {
      this.handleDownstreamMessage(line);
    });

    downstreamReader.on('close', () => {
      log('Downstream closed');
      this.stop();
    });
  }

  private handleDownstreamMessage(line: string): void {
    try {
      const message = JSON.parse(line) as JsonRpcMessage;

      if (this.isRequest(message)) {
        const result = this.messageHandler.handleDownstreamRequest(message);

        if (this.isResponse(result)) {
          this.sendDownstream(result);
          return;
        }

        this.sendUpstream(result);
      } else {
        this.sendUpstream(message);
      }
    } catch (err) {
      error('Failed to parse downstream message:', err);
    }
  }

  private async handleUpstreamMessage(line: string): Promise<void> {
    try {
      const message = JSON.parse(line) as JsonRpcMessage;

      // initialize 응답에서 serverInfo 추출
      if (this.isInitializeResponse(message)) {
        const result = (message as JsonRpcResponse).result as { serverInfo?: { name: string; version?: string } };
        if (result?.serverInfo?.name) {
          this.configManager.setServerKey(result.serverInfo);
        }
      }

      if (this.isResponse(message)) {
        const result = await this.messageHandler.handleUpstreamResponse(message);
        this.sendDownstream(result);
      } else {
        this.sendDownstream(message);
      }
    } catch (err) {
      error('Failed to parse upstream message:', err);
    }
  }

  private isInitializeResponse(msg: JsonRpcMessage): boolean {
    if (!this.isResponse(msg)) return false;
    const response = msg as JsonRpcResponse;
    return (
      response.result !== undefined &&
      typeof response.result === 'object' &&
      response.result !== null &&
      'serverInfo' in response.result &&
      typeof (response.result as { serverInfo?: unknown }).serverInfo === 'object'
    );
  }

  private sendUpstream(message: JsonRpcMessage): void {
    if (this.upstream?.stdin) {
      const line = JSON.stringify(message);
      this.upstream.stdin.write(line + '\n');
      log('-> Upstream:', message);
    }
  }

  private sendDownstream(message: JsonRpcMessage): void {
    const line = JSON.stringify(message);
    process.stdout.write(line + '\n');
    log('<- Downstream:', message);
  }

  private isRequest(msg: JsonRpcMessage): msg is JsonRpcRequest {
    return 'method' in msg && 'id' in msg;
  }

  private isResponse(msg: JsonRpcMessage): msg is JsonRpcResponse {
    return ('result' in msg || 'error' in msg) && !('method' in msg);
  }

  stop(): void {
    log('Stopping MCP Proxy');

    if (this.upstreamReader) {
      this.upstreamReader.close();
    }

    if (this.upstream) {
      this.upstream.kill();
    }

    process.exit(0);
  }
}

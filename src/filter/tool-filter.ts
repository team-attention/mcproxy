import type { ConfigManager, Tool } from '../config/config-manager.js';

export class ToolFilter {
  constructor(private configManager: ConfigManager) {}

  isEnabled(toolName: string): boolean {
    return this.configManager.isToolEnabled(toolName);
  }

  filterTools(tools: Tool[]): Tool[] {
    return tools.filter(tool => this.isEnabled(tool.name));
  }
}

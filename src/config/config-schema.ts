import { z } from 'zod';

const ToolConfigSchema = z.record(z.string(), z.boolean());

const ServerToolConfigSchema = z.object({
  tools: ToolConfigSchema,
});

export const McpProxyConfigSchema = z.object({
  version: z.string().default('1.0'),
  servers: z.record(z.string(), ServerToolConfigSchema),
});

export type ToolConfig = z.infer<typeof ToolConfigSchema>;
export type ServerToolConfig = z.infer<typeof ServerToolConfigSchema>;
export type McpProxyConfig = z.infer<typeof McpProxyConfigSchema>;

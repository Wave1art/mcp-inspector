export interface JsonSchemaProperty {
  type?: string;
  default?: unknown;
  anyOf?: { type: string }[];
  description?: string;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
}

export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: JsonSchema;
  _meta?: { _fastmcp?: { tags?: string[] } };
}

export interface McpServerInfo {
  serverInfo?: { name: string; version: string };
  protocolVersion?: string;
}

export interface LogEntry {
  direction: 'out' | 'in' | 'err';
  method: string;
  data: unknown;
  timestamp: Date;
  id: number;
}

export interface ToolGroup {
  prefix: string;
  label: string;
  items: { tool: McpTool; globalIndex: number }[];
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type ResponseViewMode = 'json' | 'table' | 'cards' | 'markdown' | 'text';

export type AuthMode = 'none' | 'oauth';

export type AuthState = 'idle' | 'discovering' | 'authorizing' | 'exchanging' | 'authenticated' | 'error';

export interface OAuthStatus {
  state: AuthState;
  token?: { expiresAt: string };
  error?: string;
}

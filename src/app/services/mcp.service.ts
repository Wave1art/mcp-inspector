import { Injectable, signal, computed } from '@angular/core';
import { McpTool, McpServerInfo, ConnectionStatus, ToolGroup, JsonSchema, McpResource, McpResourceTemplate, McpPrompt, McpPromptMessage, SidebarTab } from '../models/mcp.models';
import { LogService } from './log.service';
import { AuthService } from './auth.service';
import { HistoryService } from './history.service';

const MAX_PAGES = 20;

export function groupToolsByPrefix(toolList: McpTool[]): ToolGroup[] {
  const groups = new Map<string, { tool: McpTool; globalIndex: number }[]>();

  for (let i = 0; i < toolList.length; i++) {
    const t = toolList[i];
    const underscoreIdx = t.name.indexOf('_');

    let prefix = '';
    if (underscoreIdx > 0) {
      const candidate = t.name.substring(0, underscoreIdx);
      const count = toolList.filter(x => x.name.startsWith(candidate + '_')).length;
      if (count >= 2) prefix = candidate;
    }

    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix)!.push({ tool: t, globalIndex: i });
  }

  const result: ToolGroup[] = [];
  for (const [prefix, items] of groups) {
    result.push({
      prefix,
      label: prefix || 'root',
      items,
    });
  }
  return result;
}

export function buildDefaultArgs(tool: McpTool): Record<string, unknown> {
  const schema = tool.inputSchema || {};
  const props = schema.properties || {};
  const required = schema.required || [];
  const defaults: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(props)) {
    if (val.default !== undefined) {
      defaults[key] = val.default;
    } else if (required.includes(key)) {
      if (val.type === 'string') defaults[key] = '';
      else if (val.type === 'integer' || val.type === 'number') defaults[key] = 0;
      else if (val.type === 'boolean') defaults[key] = false;
      else if (val.type === 'object') defaults[key] = {};
      else if (val.type === 'array') defaults[key] = [];
      else defaults[key] = null;
    }
  }
  return defaults;
}

export function formatType(p: { type?: string; anyOf?: { type: string }[] }): string {
  if (p.anyOf) return p.anyOf.map(a => a.type || '?').join(' | ');
  return p.type || 'any';
}

export function validateArgs(schema: JsonSchema | undefined, args: unknown): string[] {
  const errors: string[] = [];
  if (!schema || !schema.properties) return errors;

  if (typeof args !== 'object' || args === null || Array.isArray(args)) {
    errors.push('Arguments must be a JSON object');
    return errors;
  }

  const obj = args as Record<string, unknown>;
  const required = schema.required || [];

  // Check required fields
  for (const key of required) {
    if (!(key in obj) || obj[key] === '' || obj[key] === null || obj[key] === undefined) {
      errors.push(`Missing required field: ${key}`);
    }
  }

  // Check types
  for (const [key, val] of Object.entries(obj)) {
    const prop = schema.properties[key];
    if (!prop) continue; // extra fields are ok

    const propType = prop.type;
    if (!propType) continue;

    if (propType === 'string' && typeof val !== 'string') {
      errors.push(`${key}: expected string, got ${typeof val}`);
    } else if (propType === 'number' && typeof val !== 'number') {
      errors.push(`${key}: expected number, got ${typeof val}`);
    } else if (propType === 'integer' && (typeof val !== 'number' || !Number.isInteger(val))) {
      errors.push(`${key}: expected integer`);
    } else if (propType === 'boolean' && typeof val !== 'boolean') {
      errors.push(`${key}: expected boolean, got ${typeof val}`);
    } else if (propType === 'array' && !Array.isArray(val)) {
      errors.push(`${key}: expected array, got ${typeof val}`);
    } else if (propType === 'object' && (typeof val !== 'object' || val === null || Array.isArray(val))) {
      errors.push(`${key}: expected object`);
    }
  }

  return errors;
}

@Injectable({ providedIn: 'root' })
export class McpService {
  private requestId = 0;

  readonly status = signal<ConnectionStatus>('disconnected');
  readonly tools = signal<McpTool[]>([]);
  readonly selectedTool = signal<McpTool | null>(null);
  readonly selectedToolIndex = signal<number>(-1);
  readonly sessionId = signal<string | null>(null);
  readonly serverInfo = signal<McpServerInfo | null>(null);
  readonly mcpUrl = signal<string>('http://127.0.0.1:6277/mcp');
  readonly lastCallResult = signal<{ data: unknown; isError: boolean; durationMs?: number } | null>(null);
  readonly calling = signal<boolean>(false);
  readonly collapsedGroups = signal<Set<string>>(new Set());
  readonly searchQuery = signal('');

  // Resources & Prompts
  readonly resources = signal<McpResource[]>([]);
  readonly resourceTemplates = signal<McpResourceTemplate[]>([]);
  readonly prompts = signal<McpPrompt[]>([]);
  readonly selectedResource = signal<McpResource | null>(null);
  readonly selectedPrompt = signal<McpPrompt | null>(null);
  readonly resourceContent = signal<{ data: unknown; isError: boolean } | null>(null);
  readonly promptMessages = signal<McpPromptMessage[] | null>(null);
  readonly activeTab = signal<SidebarTab>('tools');
  readonly serverCapabilities = signal<Record<string, unknown>>({});
  readonly resourceSearchQuery = signal('');
  readonly promptSearchQuery = signal('');

  readonly connected = computed(() => this.status() === 'connected');
  readonly toolGroups = computed(() => groupToolsByPrefix(this.tools()));
  readonly toolCount = computed(() => this.tools().length);

  readonly filteredToolGroups = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const groups = this.toolGroups();
    if (!query) return groups;

    return groups
      .map(group => {
        const filtered = group.items.filter(item => {
          const name = item.tool.name.toLowerCase();
          const desc = (item.tool.description || '').toLowerCase();
          return name.includes(query) || desc.includes(query);
        });
        if (filtered.length === 0) return null;
        return { ...group, items: filtered };
      })
      .filter((g): g is ToolGroup => g !== null);
  });

  constructor(
    private log: LogService,
    private auth: AuthService,
    public history: HistoryService,
  ) {}

  async loadConfig(): Promise<void> {
    try {
      const resp = await fetch('/api/config');
      if (resp.ok) {
        const config = await resp.json();
        if (config.mcpUrl) this.mcpUrl.set(config.mcpUrl);
        if (config.authMode) this.auth.setAuthMode(config.authMode);
      }
    } catch {}
  }

  async updateMcpUrl(url: string): Promise<void> {
    this.mcpUrl.set(url);
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mcpUrl: url }),
      });
    } catch {}
  }

  async connect(): Promise<void> {
    if (!this.auth.canConnect()) return;

    this.status.set('connecting');
    try {
      const initResult = await this.mcpRequest('initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'mcp-dev-inspector', version: '1.0' },
      }, true);

      if (!this.sessionId()) throw new Error('No mcp-session-id header in response');
      await this.mcpNotify('notifications/initialized');

      const capabilities = (initResult as Record<string, unknown>)?.['capabilities'] as Record<string, unknown> || {};
      this.serverCapabilities.set(capabilities);

      const allTools = await this.fetchAllTools();
      this.tools.set(allTools);
      this.serverInfo.set(initResult as McpServerInfo);

      // Fetch resources if supported
      if (capabilities['resources']) {
        try {
          const allResources = await this.fetchAllResources();
          this.resources.set(allResources);
        } catch {}
      }

      // Fetch prompts if supported
      if (capabilities['prompts']) {
        try {
          const allPrompts = await this.fetchAllPrompts();
          this.prompts.set(allPrompts);
        } catch {}
      }

      this.status.set('connected');
    } catch (err) {
      this.status.set('error');
      this.log.addEntry('err', 'connection', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  disconnect(): void {
    this.sessionId.set(null);
    this.tools.set([]);
    this.selectedTool.set(null);
    this.selectedToolIndex.set(-1);
    this.serverInfo.set(null);
    this.lastCallResult.set(null);
    this.collapsedGroups.set(new Set());
    this.resources.set([]);
    this.resourceTemplates.set([]);
    this.prompts.set([]);
    this.selectedResource.set(null);
    this.selectedPrompt.set(null);
    this.resourceContent.set(null);
    this.promptMessages.set(null);
    this.activeTab.set('tools');
    this.serverCapabilities.set({});
    this.resourceSearchQuery.set('');
    this.promptSearchQuery.set('');
    this.status.set('disconnected');
  }

  selectTool(index: number): void {
    const t = this.tools();
    if (index >= 0 && index < t.length) {
      this.selectedTool.set(t[index]);
      this.selectedToolIndex.set(index);
      this.lastCallResult.set(null);
    }
  }

  toggleGroup(prefix: string): void {
    this.collapsedGroups.update(set => {
      const next = new Set(set);
      if (next.has(prefix)) next.delete(prefix);
      else next.add(prefix);
      return next;
    });
  }

  async callTool(name: string, argsJson: string): Promise<void> {
    this.calling.set(true);
    this.lastCallResult.set(null);
    try {
      let args: unknown;
      try {
        args = JSON.parse(argsJson);
      } catch (parseErr) {
        const errorResult = {
          data: { error: `Invalid JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}` },
          isError: true,
        };
        this.lastCallResult.set(errorResult);
        this.history.addEntry(name, argsJson, errorResult.data, true);
        return;
      }
      const startTime = performance.now();
      const result = await this.mcpRequest('tools/call', { name, arguments: args }) as { isError?: boolean; content?: unknown[] };
      const durationMs = Math.round(performance.now() - startTime);
      this.lastCallResult.set({
        data: result,
        isError: !!result.isError,
        durationMs,
      });
      this.history.addEntry(name, argsJson, result, !!result.isError, durationMs);
    } catch (err) {
      const errorData = { error: err instanceof Error ? err.message : String(err) };
      this.lastCallResult.set({
        data: errorData,
        isError: true,
      });
      this.history.addEntry(name, argsJson, errorData, true);
    } finally {
      this.calling.set(false);
    }
  }

  selectResource(resource: McpResource): void {
    this.selectedResource.set(resource);
    this.selectedPrompt.set(null);
    this.resourceContent.set(null);
  }

  selectPrompt(prompt: McpPrompt): void {
    this.selectedPrompt.set(prompt);
    this.selectedResource.set(null);
    this.promptMessages.set(null);
  }

  async readResource(uri: string): Promise<void> {
    this.resourceContent.set(null);
    try {
      const result = await this.mcpRequest('resources/read', { uri }) as {
        contents?: { uri: string; mimeType?: string; text?: string; blob?: string }[];
      };
      // Transform resource response into a format the response component understands
      const contents = result.contents || [];
      const textParts = contents.map(c => c.text).filter(Boolean);
      const combinedText = textParts.join('\n');
      // Try to parse as JSON for smart rendering
      let parsedData: unknown;
      try { parsedData = JSON.parse(combinedText); } catch { parsedData = combinedText; }
      // Wrap in MCP content format so ToolResponseComponent can render it
      this.resourceContent.set({
        data: { content: [{ type: 'text', text: typeof parsedData === 'string' ? parsedData : JSON.stringify(parsedData, null, 2) }], isError: false },
        isError: false,
      });
    } catch (err) {
      this.resourceContent.set({
        data: { error: err instanceof Error ? err.message : String(err) },
        isError: true,
      });
    }
  }

  async getPrompt(name: string, args: Record<string, string>): Promise<void> {
    this.promptMessages.set(null);
    try {
      const result = await this.mcpRequest('prompts/get', { name, arguments: args }) as { messages?: McpPromptMessage[] };
      this.promptMessages.set(result.messages || []);
    } catch (err) {
      this.promptMessages.set([{
        role: 'error',
        content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
      }]);
    }
  }

  private async fetchAllResources(): Promise<McpResource[]> {
    const allResources: McpResource[] = [];
    let cursor: string | undefined;
    let page = 0;

    while (page < MAX_PAGES) {
      const params: Record<string, unknown> = {};
      if (cursor) params['cursor'] = cursor;

      const result = await this.mcpRequest('resources/list', params) as {
        resources?: McpResource[];
        nextCursor?: string;
      };
      const batch = result.resources || [];
      allResources.push(...batch);

      if (result.nextCursor) {
        cursor = result.nextCursor;
        page++;
      } else {
        break;
      }
    }
    return allResources;
  }

  private async fetchAllPrompts(): Promise<McpPrompt[]> {
    const allPrompts: McpPrompt[] = [];
    let cursor: string | undefined;
    let page = 0;

    while (page < MAX_PAGES) {
      const params: Record<string, unknown> = {};
      if (cursor) params['cursor'] = cursor;

      const result = await this.mcpRequest('prompts/list', params) as {
        prompts?: McpPrompt[];
        nextCursor?: string;
      };
      const batch = result.prompts || [];
      allPrompts.push(...batch);

      if (result.nextCursor) {
        cursor = result.nextCursor;
        page++;
      } else {
        break;
      }
    }
    return allPrompts;
  }

  private async fetchAllTools(): Promise<McpTool[]> {
    const allTools: McpTool[] = [];
    let cursor: string | undefined;
    let page = 0;

    while (page < MAX_PAGES) {
      const params: Record<string, unknown> = {};
      if (cursor) params['cursor'] = cursor;

      const result = await this.mcpRequest('tools/list', params) as {
        tools?: McpTool[];
        nextCursor?: string;
      };
      const batch = result.tools || [];
      console.log('[tools/list] raw batch:', JSON.stringify(batch, null, 2));
      allTools.push(...batch);

      if (result.nextCursor) {
        cursor = result.nextCursor;
        page++;
      } else {
        break;
      }
    }

    if (page >= MAX_PAGES) {
      this.log.addEntry('err', 'tools/list', {
        warning: `Pagination limit reached (${MAX_PAGES} pages). Some tools may be missing.`,
      });
    }

    return allTools;
  }

  private async mcpRequest(method: string, params: unknown, isInit = false): Promise<unknown> {
    const id = ++this.requestId;
    const body = { jsonrpc: '2.0', id, method, params };
    this.log.addEntry('out', method, body);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };
    const sid = this.sessionId();
    if (sid) headers['mcp-session-id'] = sid;

    const resp = await fetch('/mcp', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (isInit && resp.headers.get('mcp-session-id')) {
      this.sessionId.set(resp.headers.get('mcp-session-id'));
    }

    const text = await resp.text();
    const result = this.parseSSE(text);

    if (result) {
      this.log.addEntry('in', method, result);
      if ((result as { error?: unknown }).error) {
        throw new Error(JSON.stringify((result as { error: unknown }).error));
      }
      return (result as { result: unknown }).result;
    }
    throw new Error(`Empty response for ${method} (HTTP ${resp.status})`);
  }

  private async mcpNotify(method: string, params: Record<string, unknown> = {}): Promise<void> {
    const body = { jsonrpc: '2.0', method, params };
    this.log.addEntry('out', method, body);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };
    const sid = this.sessionId();
    if (sid) headers['mcp-session-id'] = sid;

    await fetch('/mcp', { method: 'POST', headers, body: JSON.stringify(body) });
  }

  private parseSSE(text: string): unknown {
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ')) {
        try { return JSON.parse(line.slice(6)); } catch {}
      }
    }
    try { return JSON.parse(text); } catch { return null; }
  }
}

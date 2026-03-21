import { Injectable, signal, computed } from '@angular/core';
import { McpTool, McpServerInfo, ConnectionStatus, ToolGroup } from '../models/mcp.models';
import { LogService } from './log.service';
import { AuthService } from './auth.service';

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

@Injectable({ providedIn: 'root' })
export class McpService {
  private requestId = 0;

  readonly status = signal<ConnectionStatus>('disconnected');
  readonly tools = signal<McpTool[]>([]);
  readonly selectedTool = signal<McpTool | null>(null);
  readonly selectedToolIndex = signal<number>(-1);
  readonly sessionId = signal<string | null>(null);
  readonly serverInfo = signal<McpServerInfo | null>(null);
  readonly mcpUrl = signal<string>('http://127.0.0.1:6277');
  readonly lastCallResult = signal<{ data: unknown; isError: boolean } | null>(null);
  readonly calling = signal<boolean>(false);
  readonly collapsedGroups = signal<Set<string>>(new Set());

  readonly connected = computed(() => this.status() === 'connected');
  readonly toolGroups = computed(() => groupToolsByPrefix(this.tools()));
  readonly toolCount = computed(() => this.tools().length);

  constructor(
    private log: LogService,
    private auth: AuthService,
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

      const allTools = await this.fetchAllTools();
      this.tools.set(allTools);
      this.serverInfo.set(initResult as McpServerInfo);
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
      const args = JSON.parse(argsJson);
      const result = await this.mcpRequest('tools/call', { name, arguments: args }) as { isError?: boolean; content?: unknown[] };
      this.lastCallResult.set({
        data: result,
        isError: !!result.isError,
      });
    } catch (err) {
      this.lastCallResult.set({
        data: { error: err instanceof Error ? err.message : String(err) },
        isError: true,
      });
    } finally {
      this.calling.set(false);
    }
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

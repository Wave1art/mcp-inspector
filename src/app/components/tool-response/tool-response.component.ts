import { Component, input, signal, computed, effect, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ResponseViewMode } from '../../models/mcp.models';
import { marked } from 'marked';

@Component({
  selector: 'app-tool-response',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatButtonToggleModule, MatTabsModule, MatTooltipModule],
  template: `
    <div class="response-wrap" [class.error]="isError()">
      <div class="response-header">
        <mat-icon class="result-icon" [class.error]="isError()">
          {{ isError() ? 'error' : 'check_circle' }}
        </mat-icon>
        <span class="result-label">{{ isError() ? 'Error' : 'Result' }}</span>
        @if (durationMs() !== undefined) {
          <span class="duration-label">{{ formatDuration(durationMs()!) }}</span>
        }
        <button mat-icon-button class="copy-response-btn" (click)="copyCurrentTab()" matTooltip="Copy to clipboard">
          <mat-icon>content_copy</mat-icon>
        </button>
      </div>

      <mat-tab-group class="response-tabs" [selectedIndex]="activeTab()" (selectedIndexChange)="activeTab.set($event)" animationDuration="0ms">
        <!-- Rendered tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">visibility</mat-icon>
            Rendered
          </ng-template>
          <div class="tab-body">
            @if (isError()) {
              <div class="error-display">
                <pre class="error-text">{{ errorText() }}</pre>
              </div>
            } @else {
              <div class="render-toolbar">
                <mat-button-toggle-group class="view-toggles" [value]="currentMode()" (change)="currentMode.set($event.value)" hideSingleSelectionIndicator>
                  @for (mode of availableModes(); track mode) {
                    <mat-button-toggle [value]="mode">
                      <mat-icon class="toggle-icon">{{ modeIcon(mode) }}</mat-icon>
                      {{ modeLabel(mode) }}
                    </mat-button-toggle>
                  }
                </mat-button-toggle-group>
              </div>
              <div class="render-body">
                @switch (currentMode()) {
                  @case ('json') {
                    <pre class="json-view">{{ contentJsonText() }}</pre>
                  }
                  @case ('table') {
                    <div class="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            @for (col of tableColumns(); track col) {
                              <th>{{ col }}</th>
                            }
                          </tr>
                        </thead>
                        <tbody>
                          @for (row of tableRows(); track $index) {
                            <tr>
                              @for (col of tableColumns(); track col) {
                                <td>{{ row[col] }}</td>
                              }
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }
                  @case ('cards') {
                    <div class="cards-wrap">
                      @for (card of cardItems(); track $index) {
                        <div class="card" [class.expanded]="expandedCards().has($index)">
                          <div class="card-header" (click)="toggleCard($index)">
                            <span class="card-title">{{ card.title }}</span>
                            <mat-icon class="card-chevron">{{ expandedCards().has($index) ? 'expand_less' : 'expand_more' }}</mat-icon>
                          </div>
                          @if (expandedCards().has($index)) {
                            <div class="card-body">
                              @for (field of card.fields; track field.key) {
                                <div class="card-field">
                                  <span class="field-key">{{ field.key }}</span>
                                  <span class="field-value">{{ field.value }}</span>
                                </div>
                              }
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                  @case ('markdown') {
                    <div class="markdown-view" [innerHTML]="markdownHtml()"></div>
                  }
                  @case ('text') {
                    <pre class="text-view">{{ textContent() }}</pre>
                  }
                }
              </div>
            }
          </div>
        </mat-tab>

        <!-- Metadata tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">info</mat-icon>
            Metadata
          </ng-template>
          <div class="tab-body">
            <pre class="json-view">{{ metadataJson() }}</pre>
          </div>
        </mat-tab>

        <!-- Raw JSON tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">data_object</mat-icon>
            Raw
          </ng-template>
          <div class="tab-body">
            <pre class="json-view">{{ fullJsonText() }}</pre>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .response-wrap {
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      background: var(--bg-input);
      max-height: 500px;
      display: flex;
      flex-direction: column;

      &.error { border-color: var(--red); }
    }

    .response-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--border);
      background: var(--panel-header-bg);
      flex-shrink: 0;
    }

    .result-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--green);

      &.error { color: var(--red); }
    }

    .result-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-secondary);
    }

    .duration-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--text-muted);
      margin-left: auto;
    }

    .copy-response-btn {
      width: 28px !important;
      height: 28px !important;
      line-height: 28px !important;
      flex-shrink: 0;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: var(--text-muted);
      }

      &:hover mat-icon { color: var(--accent); }
    }

    .response-tabs {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;

      ::ng-deep {
        .mat-mdc-tab-header {
          border-bottom: 1px solid var(--border);
          --mdc-secondary-navigation-tab-container-height: 32px;
        }

        .mat-mdc-tab {
          min-width: 0;
          padding: 0 12px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.3px;
        }

        .mat-mdc-tab-body-wrapper {
          flex: 1;
          overflow: hidden;
        }

        .mat-mdc-tab-body-content {
          overflow: auto;
        }

        .mdc-tab__text-label {
          display: flex;
          align-items: center;
          gap: 4px;
        }
      }
    }

    .tab-icon {
      font-size: 13px !important;
      width: 13px !important;
      height: 13px !important;
    }

    .tab-body {
      overflow-y: auto;
      scrollbar-width: thin;
    }

    .error-display {
      padding: 12px;
    }

    .error-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      line-height: 1.6;
      color: var(--red-text);
      background: var(--red-dim);
      padding: 12px;
      border-radius: 6px;
      white-space: pre-wrap;
      word-break: break-all;
      margin: 0;
    }

    .render-toolbar {
      padding: 6px 12px;
      border-bottom: 1px solid var(--border);
      background: var(--panel-header-bg);
    }

    .view-toggles {
      height: 26px;
      border-radius: 6px !important;
      border: 1px solid var(--border) !important;

      ::ng-deep {
        .mat-button-toggle {
          height: 24px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;

          .mat-button-toggle-label-content {
            padding: 0 8px;
            line-height: 24px;
            display: flex;
            align-items: center;
            gap: 3px;
          }
        }

        .mat-button-toggle-checked {
          background: var(--accent-dim) !important;
          color: var(--accent) !important;
        }
      }
    }

    .toggle-icon {
      font-size: 12px !important;
      width: 12px !important;
      height: 12px !important;
    }

    .render-body {
      overflow-y: auto;
      scrollbar-width: thin;
    }

    .json-view, .text-view {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      line-height: 1.6;
      padding: 12px;
      white-space: pre-wrap;
      word-break: break-all;
      color: var(--text-primary);
      margin: 0;
    }

    .table-wrap { overflow-x: auto; padding: 4px; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
    }

    th {
      text-align: left;
      padding: 8px 12px;
      border-bottom: 2px solid var(--border);
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
      background: var(--bg-tertiary);
    }

    td {
      padding: 8px 12px;
      border-bottom: 1px solid var(--border);
      color: var(--text-primary);
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    tr:hover td { background: var(--bg-hover); }

    .cards-wrap {
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .card {
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: var(--bg-tertiary);
      cursor: pointer;

      &:hover { background: var(--bg-hover); }
    }

    .card-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }

    .card-chevron { color: var(--text-muted); font-size: 18px; }

    .card-body {
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .card-field { display: flex; gap: 10px; font-size: 11px; }

    .field-key {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--accent);
      min-width: 100px;
      flex-shrink: 0;
      font-weight: 500;
    }

    .field-value {
      color: var(--text-primary);
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.5;
    }

    .markdown-view {
      padding: 16px;
      font-size: 13px;
      line-height: 1.7;
      color: var(--text-primary);

      :is(h1, h2, h3, h4) { color: var(--accent); margin: 14px 0 8px; }
      code {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        background: var(--bg-tertiary);
        padding: 2px 5px;
        border-radius: 4px;
      }
      pre {
        background: var(--bg-tertiary);
        padding: 12px;
        border-radius: 8px;
        overflow-x: auto;
        margin: 8px 0;
        code { background: none; padding: 0; }
      }
      a { color: var(--accent); }
      ul, ol { padding-left: 20px; margin: 6px 0; }
      p { margin: 6px 0; }
    }
  `],
})
export class ToolResponseComponent {
  result = input<unknown>(null);
  isError = input<boolean>(false);
  durationMs = input<number | undefined>(undefined);

  expandedCards = signal<Set<number>>(new Set());
  currentMode = signal<ResponseViewMode>('json');
  activeTab = signal(0);

  constructor(private sanitizer: DomSanitizer) {
    // Auto-select the best view mode when a new result arrives
    effect(() => {
      const detected = this.detectedMode();
      if (detected !== 'json') {
        this.currentMode.set(detected);
      }
    });
  }

  /**
   * Extract the core content from the MCP result.
   * MCP responses look like: { content: [{ type: "text", text: "..." }], isError: false }
   * The "content" array is the actual data; everything else is metadata.
   */
  private readonly contentItems = computed(() => {
    const res = this.result() as Record<string, unknown> | null;
    if (!res) return [];
    const content = res['content'];
    if (Array.isArray(content)) return content as { type: string; text?: string; data?: string; mimeType?: string }[];
    return [];
  });

  /**
   * Parse the text content from content items.
   * Tries JSON parsing first, falls back to raw string.
   */
  private readonly parsedContent = computed(() => {
    const items = this.contentItems();
    if (items.length === 0) {
      // No content array - might be an error or unusual response, show whole result
      return this.result();
    }

    // Combine all text items
    const textItems = items.filter(c => c.type === 'text' && c.text);
    if (textItems.length === 0) return null;

    if (textItems.length === 1) {
      const text = textItems[0].text!;
      try { return JSON.parse(text); } catch { return text; }
    }

    // Multiple text items - try combining
    const combined = textItems.map(t => t.text!).join('\n');
    try { return JSON.parse(combined); } catch { return combined; }
  });

  /**
   * Metadata: everything in the result EXCEPT content
   */
  readonly metadataJson = computed(() => {
    const res = this.result() as Record<string, unknown> | null;
    if (!res || typeof res !== 'object') return '{}';
    const meta: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(res)) {
      if (k !== 'content') meta[k] = v;
    }
    return JSON.stringify(meta, null, 2);
  });

  readonly fullJsonText = computed(() => {
    try { return JSON.stringify(this.result(), null, 2); } catch { return String(this.result()); }
  });

  readonly contentJsonText = computed(() => {
    const data = this.parsedContent();
    try { return JSON.stringify(data, null, 2); } catch { return String(data); }
  });

  readonly errorText = computed(() => {
    const res = this.result() as Record<string, unknown> | null;
    if (!res) return 'Unknown error';
    const err = res['error'];
    if (typeof err === 'string') {
      // Try to pretty-print if it's JSON
      try { return JSON.stringify(JSON.parse(err), null, 2); } catch { return err; }
    }
    if (typeof err === 'object') return JSON.stringify(err, null, 2);
    return JSON.stringify(res, null, 2);
  });

  readonly detectedMode = computed((): ResponseViewMode => {
    if (this.isError()) return 'json';
    const data = this.parsedContent();
    if (data == null) return 'text';
    if (typeof data === 'string') {
      if (/^#{1,6}\s|^\*\*|^- |^```|^\|.*\|/m.test(data)) return 'markdown';
      return 'text';
    }
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      const firstKeys = Object.keys(data[0]);
      const allSameKeys = data.every(
        item => typeof item === 'object' && item !== null &&
        firstKeys.every(k => k in (item as Record<string, unknown>))
      );
      if (allSameKeys) {
        const hasLongStrings = data.some(item =>
          Object.values(item as Record<string, unknown>).some(v => typeof v === 'string' && v.length > 100)
        );
        return hasLongStrings ? 'cards' : 'table';
      }
    }
    return 'json';
  });

  readonly availableModes = computed((): ResponseViewMode[] => {
    const detected = this.detectedMode();
    const modes: ResponseViewMode[] = ['json'];
    if (detected === 'table') modes.push('table');
    if (detected === 'cards') modes.push('cards', 'table');
    if (detected === 'markdown') modes.push('markdown');
    if (detected === 'text') modes.push('text');
    return modes;
  });

  readonly textContent = computed(() => {
    const data = this.parsedContent();
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  });

  readonly markdownHtml = computed((): SafeHtml => {
    const data = this.parsedContent();
    const text = typeof data === 'string' ? data : '';
    const html = marked.parse(text) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  readonly tableColumns = computed((): string[] => {
    const data = this.parsedContent();
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      return Object.keys(data[0]);
    }
    return [];
  });

  readonly tableRows = computed((): Record<string, unknown>[] => {
    const data = this.parsedContent();
    if (Array.isArray(data)) {
      return data.map(item => {
        if (typeof item === 'object' && item !== null) {
          const row: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(item)) {
            row[k] = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
          }
          return row;
        }
        return { value: String(item) };
      });
    }
    return [];
  });

  readonly cardItems = computed(() => {
    const data = this.parsedContent();
    if (!Array.isArray(data)) return [];
    return data.map((item, i) => {
      if (typeof item !== 'object' || item === null) {
        return { title: `Item ${i + 1}`, fields: [{ key: 'value', value: String(item) }] };
      }
      const entries = Object.entries(item as Record<string, unknown>);
      const titleField = entries.find(([, v]) => typeof v === 'string' && v.length < 80);
      return {
        title: titleField ? String(titleField[1]).slice(0, 80) : `Item ${i + 1}`,
        fields: entries.map(([key, value]) => ({
          key,
          value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? ''),
        })),
      };
    });
  });

  modeLabel(mode: ResponseViewMode): string {
    return { json: 'JSON', table: 'Table', cards: 'Cards', markdown: 'MD', text: 'Text' }[mode];
  }

  modeIcon(mode: ResponseViewMode): string {
    return { json: 'data_object', table: 'table_chart', cards: 'view_agenda', markdown: 'article', text: 'notes' }[mode];
  }

  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  copyCurrentTab(): void {
    const tabIndex = this.activeTab();
    let text: string;
    switch (tabIndex) {
      case 0: // Rendered
        text = this.contentJsonText();
        break;
      case 1: // Metadata
        text = this.metadataJson();
        break;
      case 2: // Raw
        text = this.fullJsonText();
        break;
      default:
        text = this.fullJsonText();
    }
    navigator.clipboard.writeText(text);
  }

  toggleCard(index: number): void {
    this.expandedCards.update(set => {
      const next = new Set(set);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }
}

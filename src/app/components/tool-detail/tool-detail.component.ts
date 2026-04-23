import { Component, signal, computed, inject, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { McpService, buildDefaultArgs, formatType, validateArgs } from '../../services/mcp.service';
import { HistoryService, HistoryEntry } from '../../services/history.service';
import { ToolResponseComponent } from '../tool-response/tool-response.component';
import { DescriptionModalComponent } from '../description-modal/description-modal.component';
import { SchemaFormComponent } from '../schema-form/schema-form.component';

type CachedToolState = {
  argsJson: string;
  viewMode: 'form' | 'json';
  result: { data: unknown; isError: boolean; durationMs?: number } | null;
};

@Component({
  selector: 'app-tool-detail',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatButtonToggleModule, MatIconModule, MatTooltipModule, MatDialogModule, MatTabsModule, ToolResponseComponent, SchemaFormComponent],
  template: `
    <div class="panel">
      <div class="panel-header">
        <mat-icon class="header-icon">play_circle</mat-icon>
        <span class="header-title">Call Tool</span>
      </div>
      <div class="panel-body">
        @if (mcp.selectedTool(); as tool) {
          <div class="tool-detail">
            <div class="tool-header">
              <div class="detail-title">{{ tool.name }}</div>
            </div>

            @if (tool.description) {
              <div class="detail-desc"
                (click)="openDescriptionModal(tool.name, tool.description)"
                matTooltip="Click to view full description">
                {{ tool.description }}
              </div>
            }

            <div class="meta-tab-section">
              <mat-tab-group animationDuration="0ms" class="tool-tab-group">

                <mat-tab>
                  <ng-template mat-tab-label>
                    Parameters
                    @if (params().length) {
                      <span class="tab-badge">{{ params().length }}</span>
                    }
                  </ng-template>
                  <div class="tab-content">
                    @if (params().length) {
                      <div class="params-table">
                        @for (p of params(); track p.name) {
                          <div class="param-row">
                            <span class="param-name">{{ p.name }}</span>
                            <span class="param-type">{{ p.type }}</span>
                            @if (p.required) {
                              <span class="param-required">required</span>
                            }
                          </div>
                        }
                      </div>
                    } @else {
                      <div class="tab-empty">No parameters</div>
                    }
                  </div>
                </mat-tab>

                <mat-tab>
                  <ng-template mat-tab-label>
                    Tags
                    @if (toolTags().length) {
                      <span class="tab-badge">{{ toolTags().length }}</span>
                    }
                  </ng-template>
                  <div class="tab-content">
                    @if (toolTags().length) {
                      <div class="tags-list">
                        @for (tag of toolTags(); track tag) {
                          <span class="tag">{{ tag }}</span>
                        }
                      </div>
                    } @else {
                      <div class="tab-empty">No tags</div>
                    }
                  </div>
                </mat-tab>

                <mat-tab label="Annotations">
                  <div class="tab-content">
                    @if (toolAnnotations().length) {
                      <div class="annotations-table">
                        @for (a of toolAnnotations(); track a.label) {
                          <div class="annotation-row">
                            <span class="ann-label">{{ a.label }}</span>
                            <span class="ann-value"
                              [class.bool-true]="a.value === true"
                              [class.bool-false]="a.value === false">
                              {{ a.value }}
                            </span>
                          </div>
                        }
                      </div>
                    } @else {
                      <div class="tab-empty">No annotations</div>
                    }
                  </div>
                </mat-tab>

                <mat-tab label="Raw">
                  <div class="tab-content">
                    <pre class="raw-json">{{ toolRawJson() }}</pre>
                  </div>
                </mat-tab>

              </mat-tab-group>
            </div>

            <div class="editor-section">
              <div class="section-label-row">
                <div class="section-label">
                  <mat-icon class="section-icon">data_object</mat-icon>
                  Arguments
                </div>
                @if (hasSchemaProperties()) {
                  <mat-button-toggle-group
                    [value]="viewMode()"
                    (change)="onViewModeChange($event.value)"
                    class="view-toggle">
                    <mat-button-toggle value="form">Form</mat-button-toggle>
                    <mat-button-toggle value="json">JSON</mat-button-toggle>
                  </mat-button-toggle-group>
                }
              </div>

              @if (viewMode() === 'form' && hasSchemaProperties()) {
                <app-schema-form
                  [schema]="mcp.selectedTool()!.inputSchema"
                  [initialValues]="formInitialValues()"
                  (valuesChange)="onFormValuesChange($event)"
                />
              } @else {
                <textarea
                  class="json-editor"
                  [ngModel]="argsJson()"
                  (ngModelChange)="argsJson.set($event)"
                  (keydown.tab)="onTab($event)"
                  spellcheck="false"
                ></textarea>
              }
            </div>

            @if (validationErrors().length) {
              <div class="validation-errors">
                @for (err of validationErrors(); track err) {
                  <div class="validation-error">
                    <mat-icon class="validation-icon">warning</mat-icon>
                    {{ err }}
                  </div>
                }
              </div>
            }

            <div class="call-actions">
              <button mat-flat-button class="call-btn"
                (click)="callTool()"
                [disabled]="mcp.calling()">
                <mat-icon>play_arrow</mat-icon>
                {{ mcp.calling() ? 'Calling...' : 'Call Tool' }}
                <span class="shortcut-hint">{{ isMac ? '⌘' : 'Ctrl' }}+↵</span>
              </button>
              <button mat-stroked-button (click)="formatJson()" matTooltip="Format JSON">
                <mat-icon>auto_fix_high</mat-icon>
                Format
              </button>
              <button mat-stroked-button (click)="resetTool()" matTooltip="Clear inputs and output" [disabled]="!canReset()">
                <mat-icon>restart_alt</mat-icon>
                Reset
              </button>
            </div>

            @if (mcp.lastCallResult(); as result) {
              <app-tool-response [result]="result.data" [isError]="result.isError" [durationMs]="mcp.lastCallResult()?.durationMs" />
            }

            @if (toolHistory().length) {
              <div class="history-section">
                <div class="history-header" (click)="historyExpanded.set(!historyExpanded())">
                  <div class="section-label">
                    <mat-icon class="section-icon">history</mat-icon>
                    History ({{ toolHistory().length }})
                  </div>
                  <div class="history-actions">
                    <button mat-icon-button class="history-clear-btn"
                      (click)="clearToolHistory($event)"
                      matTooltip="Clear history for this tool">
                      <mat-icon>delete_sweep</mat-icon>
                    </button>
                    <mat-icon class="expand-icon">{{ historyExpanded() ? 'expand_less' : 'expand_more' }}</mat-icon>
                  </div>
                </div>

                @if (historyExpanded()) {
                  <div class="history-list">
                    @for (entry of toolHistory(); track entry.id) {
                      <div class="history-entry" [class.error]="entry.isError" (click)="loadHistoryEntry(entry)">
                        <div class="history-meta">
                          <span class="history-time">{{ formatTime(entry.timestamp) }}</span>
                          @if (entry.durationMs != null) {
                            <span class="history-duration">{{ entry.durationMs }}ms</span>
                          }
                          <span class="history-args">{{ truncateArgs(entry.args) }}</span>
                        </div>
                        <button mat-icon-button class="replay-btn"
                          (click)="replayEntry(entry, $event)"
                          matTooltip="Replay this call"
                          [disabled]="mcp.calling()">
                          <mat-icon>replay</mat-icon>
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        } @else {
          <div class="empty-state">
            <mat-icon class="empty-icon">touch_app</mat-icon>
            <span>Select a tool from the list</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex: 1; }

    .panel {
      display: flex;
      flex-direction: column;
      width: 100%;
      background: var(--bg-secondary);
    }

    .panel-header {
      padding: 12px 16px;
      background: var(--panel-header-bg);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .header-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--accent);
    }

    .header-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: var(--text-secondary);
    }

    .panel-body {
      flex: 1;
      overflow-y: auto;
      scrollbar-width: thin;
    }

    .tool-detail {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .tool-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .detail-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 16px;
      font-weight: 700;
      color: var(--accent);
    }

    .detail-desc {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.7;
      max-height: 160px;
      overflow-y: auto;
      white-space: pre-wrap;
      cursor: pointer;
      padding: 12px;
      border-radius: 8px;
      background: var(--bg-tertiary);
      border: 1px solid transparent;
      transition: border-color 0.15s, background 0.15s;

      &:hover {
        border-color: var(--border);
        background: var(--bg-hover);
      }
    }

    .editor-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .meta-tab-section {
      background: var(--bg-tertiary);
      border-radius: 8px;
      border: 1px solid var(--border);
      overflow: hidden;
    }

    .tool-tab-group {
      ::ng-deep {
        .mat-mdc-tab-header {
          background: var(--panel-header-bg);
          border-bottom: 1px solid var(--border);
        }
        .mat-mdc-tab {
          min-width: 0;
          padding: 0 12px;
          height: 34px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.5px;
          opacity: 1;
        }
        .mat-mdc-tab .mdc-tab__text-label {
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .mat-mdc-tab.mdc-tab--active .mdc-tab__text-label {
          color: var(--accent);
        }
        .mdc-tab-indicator__content--underline {
          border-color: var(--accent);
        }
        .mat-mdc-tab-body-content {
          overflow: hidden;
        }
      }
    }

    .tab-content {
      padding: 10px;
    }

    .tab-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      font-weight: 600;
      background: var(--accent-dim);
      color: var(--accent);
      padding: 1px 5px;
      border-radius: 8px;
      line-height: 1.4;
    }

    .tab-empty {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--text-muted);
      padding: 4px 2px;
      font-style: italic;
    }

    .tags-list {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }

    .tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--accent-dim);
      color: var(--accent);
    }

    .annotations-table {
      display: flex;
      flex-direction: column;
    }

    .annotation-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 5px 0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      border-bottom: 1px solid var(--border);
      &:last-child { border-bottom: none; }
    }

    .ann-label {
      color: var(--text-muted);
      font-size: 10px;
      min-width: 100px;
    }

    .ann-value {
      color: var(--text-primary);
      &.bool-true { color: var(--green, #66bb6a); }
      &.bool-false { color: var(--red, #e53935); }
    }

    .raw-json {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      line-height: 1.5;
      color: var(--text-secondary);
      white-space: pre-wrap;
      word-break: break-all;
      margin: 0;
      max-height: 240px;
      overflow-y: auto;
      scrollbar-width: thin;
    }

    .section-label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .section-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .section-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .view-toggle {
      ::ng-deep .mat-button-toggle-label-content {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        font-weight: 600;
        padding: 0 10px;
        line-height: 26px;
      }

      ::ng-deep .mat-button-toggle {
        height: 26px;
      }
    }

    .params-table {
      background: var(--bg-tertiary);
      border-radius: 8px;
      padding: 4px 0;
    }

    .param-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
    }

    .param-name { color: var(--accent); min-width: 120px; font-weight: 500; }
    .param-type { color: var(--text-muted); font-size: 10px; }
    .param-required {
      font-size: 9px;
      font-weight: 600;
      color: var(--amber);
      background: var(--amber-dim);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .json-editor {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      line-height: 1.6;
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text-primary);
      padding: 12px;
      resize: vertical;
      outline: none;
      min-height: 80px;
      height: 120px;
      tab-size: 2;
      transition: border-color 0.15s;

      &:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 2px var(--accent-dim);
      }
    }

    .validation-errors {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .validation-error {
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--red, #e53935);
      padding: 6px 10px;
      background: var(--red-dim, rgba(229, 57, 53, 0.08));
      border-radius: 6px;
    }

    .validation-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: var(--amber, #ffa726);
      flex-shrink: 0;
    }

    .call-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }

    .call-btn {
      background: var(--accent) !important;
      color: var(--accent-text) !important;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;

      mat-icon { margin-right: 4px; }

      .shortcut-hint {
        margin-left: 8px;
        font-size: 9px;
        opacity: 0.6;
        font-weight: 400;
      }

      &:disabled { opacity: 0.5; }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--text-muted);
      font-size: 12px;
      gap: 12px;
      padding: 20px;
    }

    .empty-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      opacity: 0.4;
    }

    /* History section */
    .history-section {
      border-top: 1px solid var(--border);
      padding-top: 12px;
    }

    .history-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      padding: 4px 0;
      user-select: none;
    }

    .history-actions {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .history-clear-btn {
      width: 28px !important;
      height: 28px !important;
      padding: 0 !important;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--text-muted);
      }
    }

    .expand-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--text-muted);
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-top: 8px;
      max-height: 200px;
      overflow-y: auto;
      scrollbar-width: thin;
    }

    .history-entry {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      background: var(--bg-tertiary);
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s;
      gap: 8px;

      &:hover {
        background: var(--bg-hover);
      }

      &.error {
        border-left: 2px solid var(--red, #e53935);
      }
    }

    .history-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      min-width: 0;
      flex: 1;
    }

    .history-time {
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .history-duration {
      color: var(--accent);
      flex-shrink: 0;
      font-size: 9px;
    }

    .history-args {
      color: var(--text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }

    .replay-btn {
      width: 24px !important;
      height: 24px !important;
      padding: 0 !important;
      flex-shrink: 0;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: var(--accent);
      }
    }
  `],
})
export class ToolDetailComponent {
  private dialog = inject(MatDialog);
  readonly history = inject(HistoryService);

  readonly isMac = navigator.platform.toUpperCase().includes('MAC');
  argsJson = signal('{}');
  viewMode = signal<'form' | 'json'>('form');
  historyExpanded = signal(false);
  private _lastToolName: string | null = null;
  private readonly toolStateCache = new Map<string, CachedToolState>();

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      if (this.mcp.selectedTool() && !this.mcp.calling()) {
        this.callTool();
      }
    }
  }

  readonly validationErrors = computed(() => {
    const tool = this.mcp.selectedTool();
    if (!tool) return [];
    const json = this.argsJson();
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      return [`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`];
    }
    return validateArgs(tool.inputSchema, parsed);
  });

  readonly params = computed(() => {
    const tool = this.mcp.selectedTool();
    if (!tool) return [];
    const schema = tool.inputSchema || {};
    const props = schema.properties || {};
    const required = schema.required || [];
    return Object.entries(props).map(([name, p]) => ({
      name,
      type: formatType(p),
      required: required.includes(name),
    }));
  });

  readonly hasSchemaProperties = computed(() => {
    const tool = this.mcp.selectedTool();
    if (!tool) return false;
    const props = tool.inputSchema?.properties;
    return props != null && Object.keys(props).length > 0;
  });

  readonly formInitialValues = computed(() => {
    const json = this.argsJson();
    try {
      return JSON.parse(json) as Record<string, unknown>;
    } catch {
      return {};
    }
  });

  readonly toolTags = computed(() => {
    const tool = this.mcp.selectedTool();
    if (!tool) return [];
    return tool.tags ?? tool._meta?.['fastmcp']?.tags ?? [];
  });

  readonly toolAnnotations = computed((): { label: string; value: string | boolean }[] => {
    const ann = this.mcp.selectedTool()?.annotations;
    if (!ann) return [];
    const entries: { label: string; value: string | boolean }[] = [];
    if (ann.title != null) entries.push({ label: 'Title', value: ann.title });
    if (ann.readOnlyHint != null) entries.push({ label: 'Read Only', value: ann.readOnlyHint });
    if (ann.destructiveHint != null) entries.push({ label: 'Destructive', value: ann.destructiveHint });
    if (ann.idempotentHint != null) entries.push({ label: 'Idempotent', value: ann.idempotentHint });
    if (ann.openWorldHint != null) entries.push({ label: 'Open World', value: ann.openWorldHint });
    return entries;
  });

  readonly toolRawJson = computed(() => {
    const tool = this.mcp.selectedTool();
    if (!tool) return '';
    const { name, description, ...rest } = tool as unknown as Record<string, unknown>;
    return JSON.stringify(rest, null, 2);
  });

  readonly canReset = computed(() => {
    const tool = this.mcp.selectedTool();
    if (!tool) return false;
    if (this.mcp.lastCallResult() !== null) return true;
    const defaults = buildDefaultArgs(tool);
    try {
      const current = JSON.parse(this.argsJson());
      return JSON.stringify(current) !== JSON.stringify(defaults);
    } catch {
      return true;
    }
  });

  readonly toolHistory = computed(() => {
    const tool = this.mcp.selectedTool();
    if (!tool) return [];
    // Access entries signal to track changes
    this.history.entries();
    return this.history.getEntriesForTool(tool.name);
  });

  constructor(public mcp: McpService) {}

  ngDoCheck(): void {
    const tool = this.mcp.selectedTool();
    const currentName = tool?.name || null;
    if (currentName !== this._lastToolName) {
      // Persist current args/viewMode for the departing tool (result was already cached by callTool)
      if (this._lastToolName) {
        const existing = this.toolStateCache.get(this._lastToolName);
        this.toolStateCache.set(this._lastToolName, {
          argsJson: this.argsJson(),
          viewMode: this.viewMode(),
          result: existing?.result ?? null,
        });
      }
      this._lastToolName = currentName;
      if (tool && currentName) {
        const cached = this.toolStateCache.get(currentName);
        if (cached) {
          this.argsJson.set(cached.argsJson);
          this.viewMode.set(cached.viewMode);
          this.mcp.lastCallResult.set(cached.result);
        } else {
          this.argsJson.set(JSON.stringify(buildDefaultArgs(tool), null, 2));
          const hasProps = tool.inputSchema?.properties && Object.keys(tool.inputSchema.properties).length > 0;
          this.viewMode.set(hasProps ? 'form' : 'json');
        }
      }
    }
  }

  onViewModeChange(mode: 'form' | 'json'): void {
    this.viewMode.set(mode);
  }

  onFormValuesChange(values: Record<string, unknown>): void {
    this.argsJson.set(JSON.stringify(values, null, 2));
  }

  async callTool(): Promise<void> {
    const tool = this.mcp.selectedTool();
    if (tool) {
      await this.mcp.callTool(tool.name, this.argsJson());
      // Cache the result so it survives switching away from this tool and back
      const existing = this.toolStateCache.get(tool.name);
      this.toolStateCache.set(tool.name, {
        argsJson: existing?.argsJson ?? this.argsJson(),
        viewMode: existing?.viewMode ?? this.viewMode(),
        result: this.mcp.lastCallResult(),
      });
    }
  }

  resetTool(): void {
    const tool = this.mcp.selectedTool();
    if (tool) {
      this.toolStateCache.delete(tool.name);
      this.argsJson.set(JSON.stringify(buildDefaultArgs(tool), null, 2));
      const hasProps = tool.inputSchema?.properties && Object.keys(tool.inputSchema.properties).length > 0;
      this.viewMode.set(hasProps ? 'form' : 'json');
      this.mcp.lastCallResult.set(null);
    }
  }

  formatJson(): void {
    try {
      this.argsJson.update(json => JSON.stringify(JSON.parse(json), null, 2));
    } catch {}
  }

  onTab(event: Event): void {
    event.preventDefault();
    const el = event.target as HTMLTextAreaElement;
    const s = el.selectionStart;
    const val = el.value;
    this.argsJson.set(val.substring(0, s) + '  ' + val.substring(el.selectionEnd));
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = s + 2;
    });
  }

  openDescriptionModal(name: string, description: string): void {
    this.dialog.open(DescriptionModalComponent, {
      data: { name, description },
      width: '680px',
      maxHeight: '80vh',
    });
  }

  // History methods
  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  truncateArgs(args: string): string {
    const trimmed = args.replace(/\s+/g, ' ').trim();
    return trimmed.length > 50 ? trimmed.substring(0, 50) + '...' : trimmed;
  }

  loadHistoryEntry(entry: HistoryEntry): void {
    this.argsJson.set(entry.args);
    this.viewMode.set('json');
  }

  replayEntry(entry: HistoryEntry, event: Event): void {
    event.stopPropagation();
    this.argsJson.set(entry.args);
    this.viewMode.set('json');
    this.callTool();
  }

  clearToolHistory(event: Event): void {
    event.stopPropagation();
    const tool = this.mcp.selectedTool();
    if (tool) {
      this.history.clearForTool(tool.name);
    }
  }
}

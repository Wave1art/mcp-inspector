import { Component, signal, computed, inject, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { McpService, buildDefaultArgs, formatType, validateArgs } from '../../services/mcp.service';
import { ToolResponseComponent } from '../tool-response/tool-response.component';
import { DescriptionModalComponent } from '../description-modal/description-modal.component';

@Component({
  selector: 'app-tool-detail',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatTooltipModule, MatDialogModule, ToolResponseComponent],
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

            @if (params().length) {
              <div class="schema-section">
                <div class="section-label">
                  <mat-icon class="section-icon">schema</mat-icon>
                  Parameters
                </div>
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
              </div>
            }

            <div class="editor-section">
              <div class="section-label">
                <mat-icon class="section-icon">data_object</mat-icon>
                Arguments (JSON)
              </div>
              <textarea
                class="json-editor"
                [ngModel]="argsJson()"
                (ngModelChange)="argsJson.set($event)"
                (keydown.tab)="onTab($event)"
                spellcheck="false"
              ></textarea>
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
            </div>

            @if (mcp.lastCallResult(); as result) {
              <app-tool-response [result]="result.data" [isError]="result.isError" [durationMs]="mcp.lastCallResult()?.durationMs" />
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

    .schema-section, .editor-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
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
  `],
})
export class ToolDetailComponent {
  private dialog = inject(MatDialog);

  readonly isMac = navigator.platform.toUpperCase().includes('MAC');
  argsJson = signal('{}');
  private _lastToolName: string | null = null;

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

  constructor(public mcp: McpService) {}

  ngDoCheck(): void {
    const tool = this.mcp.selectedTool();
    const currentName = tool?.name || null;
    if (currentName && currentName !== this._lastToolName) {
      this._lastToolName = currentName;
      if (tool) {
        this.argsJson.set(JSON.stringify(buildDefaultArgs(tool), null, 2));
      }
    }
  }

  callTool(): void {
    const tool = this.mcp.selectedTool();
    if (tool) {
      this.mcp.callTool(tool.name, this.argsJson());
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
}

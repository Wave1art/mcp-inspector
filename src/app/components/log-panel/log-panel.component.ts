import { Component, signal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LogService } from '../../services/log.service';
import { LogEntry } from '../../models/mcp.models';

@Component({
  selector: 'app-log-panel',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatButtonModule, MatButtonToggleModule, MatTooltipModule],
  template: `
    <div class="panel">
      <div class="panel-header">
        <mat-icon class="header-icon">terminal</mat-icon>
        <span class="header-title">JSON-RPC Log</span>
        <button mat-icon-button class="header-btn export-btn" (click)="exportLog()" matTooltip="Export log as JSON">
          <mat-icon>download</mat-icon>
        </button>
        <button mat-icon-button class="header-btn" (click)="log.clear()" matTooltip="Clear log">
          <mat-icon>delete_sweep</mat-icon>
        </button>
        <button mat-icon-button class="header-btn" (click)="closePanel.emit()" matTooltip="Hide log panel">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="filter-bar">
        <mat-button-toggle-group multiple class="dir-toggles" [value]="dirFilterArray()" (change)="onDirFilterChange($event.value)" hideSingleSelectionIndicator>
          <mat-button-toggle value="out">SENT</mat-button-toggle>
          <mat-button-toggle value="in">RESP</mat-button-toggle>
          <mat-button-toggle value="err">ERR</mat-button-toggle>
        </mat-button-toggle-group>
        <input
          class="method-search"
          type="text"
          placeholder="Filter method..."
          [ngModel]="log.methodFilter()"
          (ngModelChange)="log.methodFilter.set($event)"
          spellcheck="false"
        />
      </div>

      <div class="panel-body">
        @if (log.filteredEntries().length === 0) {
          <div class="empty-state">
            <mat-icon class="empty-icon">receipt_long</mat-icon>
            <span>No requests yet</span>
          </div>
        } @else {
          @for (entry of log.filteredEntries(); track entry.id) {
            <div
              class="log-entry"
              [class.expanded]="expandedEntries().has(entry.id)"
              (click)="toggleEntry(entry.id)"
            >
              <div class="log-meta">
                <span class="log-dir" [class]="entry.direction">{{ dirLabel(entry.direction) }}</span>
                <span class="log-method">{{ entry.method }}</span>
                @if (entry.durationMs !== undefined) {
                  <span class="log-duration">{{ formatDuration(entry.durationMs) }}</span>
                }
                <span class="log-time">{{ formatTime(entry.timestamp) }}</span>
                <button mat-icon-button class="copy-btn" (click)="copyEntry(entry, $event)" matTooltip="Copy to clipboard">
                  <mat-icon>content_copy</mat-icon>
                </button>
              </div>
              @if (expandedEntries().has(entry.id)) {
                <pre class="log-body">{{ formatData(entry.data) }}</pre>
              }
            </div>
          }
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

    .header-btn {
      width: 28px !important;
      height: 28px !important;
      line-height: 28px !important;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--text-muted);
      }

      &:hover mat-icon { color: var(--red); }
    }

    .export-btn {
      margin-left: auto;
      &:hover mat-icon { color: var(--accent); }
    }

    .filter-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-bottom: 1px solid var(--border);
      background: var(--panel-header-bg);
      flex-shrink: 0;
    }

    .dir-toggles {
      height: 24px;
      border-radius: 6px !important;
      border: 1px solid var(--border) !important;

      ::ng-deep {
        .mat-button-toggle {
          height: 22px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;

          .mat-button-toggle-label-content {
            padding: 0 8px;
            line-height: 22px;
          }
        }

        .mat-button-toggle-checked {
          background: var(--accent-dim) !important;
          color: var(--accent) !important;
        }
      }
    }

    .method-search {
      flex: 1;
      min-width: 80px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      padding: 4px 8px;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--bg-input);
      color: var(--text-primary);
      outline: none;

      &:focus { border-color: var(--accent); }
      &::placeholder { color: var(--text-muted); }
    }

    .panel-body {
      flex: 1;
      overflow-y: auto;
      scrollbar-width: thin;
    }

    .log-entry {
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      cursor: pointer;
      transition: background 0.1s;

      &:hover { background: var(--bg-hover); }
      &:hover .copy-btn { opacity: 1; }
    }

    .log-meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .log-dir {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.5px;

      &.out { background: var(--log-out-bg); color: var(--log-out-text); }
      &.in  { background: var(--log-in-bg);  color: var(--log-in-text); }
      &.err { background: var(--log-err-bg); color: var(--log-err-text); }
    }

    .log-method {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--text-secondary);
    }

    .log-duration {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      padding: 1px 5px;
      border-radius: 4px;
      background: var(--accent-dim);
      color: var(--accent);
      white-space: nowrap;
    }

    .log-time {
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-muted);
      font-size: 10px;
      margin-left: auto;
    }

    .copy-btn {
      opacity: 0;
      transition: opacity 0.15s;
      width: 24px !important;
      height: 24px !important;
      line-height: 24px !important;
      flex-shrink: 0;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: var(--text-muted);
      }

      &:hover mat-icon { color: var(--accent); }
    }

    .log-body {
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-muted);
      font-size: 10px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-all;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--border);
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
export class LogPanelComponent {
  closePanel = output();
  expandedEntries = signal<Set<number>>(new Set());

  constructor(public log: LogService) {}

  dirFilterArray(): string[] {
    return Array.from(this.log.directionFilter());
  }

  onDirFilterChange(values: string[]): void {
    this.log.directionFilter.set(new Set(values as LogEntry['direction'][]));
  }

  toggleEntry(id: number): void {
    this.expandedEntries.update(set => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  dirLabel(dir: string): string {
    return { out: '\u2192 SENT', in: '\u2190 RESP', err: '\u2715 ERR' }[dir] || dir;
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-GB', { hour12: false });
  }

  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  formatData(data: unknown): string {
    try { return JSON.stringify(data, null, 2); } catch { return String(data); }
  }

  copyEntry(entry: LogEntry, event: Event): void {
    event.stopPropagation();
    const text = JSON.stringify({
      direction: entry.direction,
      method: entry.method,
      timestamp: entry.timestamp.toISOString(),
      durationMs: entry.durationMs,
      data: entry.data,
    }, null, 2);
    navigator.clipboard.writeText(text);
  }

  exportLog(): void {
    const data = this.log.entries().map(e => ({
      direction: e.direction,
      method: e.method,
      timestamp: e.timestamp.toISOString(),
      durationMs: e.durationMs,
      data: e.data,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcp-log-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

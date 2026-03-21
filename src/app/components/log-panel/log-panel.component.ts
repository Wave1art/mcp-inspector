import { Component, signal, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LogService } from '../../services/log.service';

@Component({
  selector: 'app-log-panel',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <div class="panel">
      <div class="panel-header">
        <mat-icon class="header-icon">terminal</mat-icon>
        <span class="header-title">JSON-RPC Log</span>
        <button mat-icon-button class="header-btn" (click)="log.clear()" matTooltip="Clear log">
          <mat-icon>delete_sweep</mat-icon>
        </button>
        <button mat-icon-button class="header-btn" (click)="closePanel.emit()" matTooltip="Hide log panel">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="panel-body">
        @if (log.entries().length === 0) {
          <div class="empty-state">
            <mat-icon class="empty-icon">receipt_long</mat-icon>
            <span>No requests yet</span>
          </div>
        } @else {
          @for (entry of log.entries(); track entry.id) {
            <div
              class="log-entry"
              [class.expanded]="expandedEntries().has(entry.id)"
              (click)="toggleEntry(entry.id)"
            >
              <div class="log-meta">
                <span class="log-dir" [class]="entry.direction">{{ dirLabel(entry.direction) }}</span>
                <span class="log-method">{{ entry.method }}</span>
                <span class="log-time">{{ formatTime(entry.timestamp) }}</span>
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
      padding: 8px 16px;
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
      margin-left: auto;
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

    .log-time {
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-muted);
      font-size: 10px;
      margin-left: auto;
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

  toggleEntry(id: number): void {
    this.expandedEntries.update(set => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  dirLabel(dir: string): string {
    return { out: '\u2192 OUT', in: '\u2190 IN', err: '\u2715 ERR' }[dir] || dir;
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-GB', { hour12: false });
  }

  formatData(data: unknown): string {
    try { return JSON.stringify(data, null, 2); } catch { return String(data); }
  }
}

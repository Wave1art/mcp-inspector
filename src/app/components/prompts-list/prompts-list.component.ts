import { Component, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { McpService } from '../../services/mcp.service';

@Component({
  selector: 'app-prompts-list',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatRippleModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="panel">
      @if (mcp.serverInfo(); as info) {
        <div class="server-info">
          <mat-icon class="info-icon">dns</mat-icon>
          <span class="server-name">{{ info.serverInfo?.name || 'Unknown' }}</span>
          <span class="server-version">v{{ info.serverInfo?.version || '?' }}</span>
        </div>
      }

      <div class="panel-body">
        @if (mcp.connected() && mcp.prompts().length > 0) {
          <div class="search-bar">
            <mat-form-field appearance="outline" class="search-field" subscriptSizing="dynamic">
              <mat-icon matPrefix class="search-icon">search</mat-icon>
              <input matInput
                placeholder="Filter prompts..."
                [ngModel]="mcp.promptSearchQuery()"
                (ngModelChange)="mcp.promptSearchQuery.set($event)">
              @if (mcp.promptSearchQuery()) {
                <button mat-icon-button matSuffix (click)="mcp.promptSearchQuery.set('')" class="clear-btn">
                  <mat-icon>close</mat-icon>
                </button>
              }
            </mat-form-field>
          </div>
        }

        @if (!mcp.connected()) {
          <div class="empty-state">
            <mat-icon class="empty-icon">power_off</mat-icon>
            <span>Connect to list prompts</span>
          </div>
        } @else if (mcp.prompts().length === 0) {
          <div class="empty-state">
            <mat-icon class="empty-icon">chat_bubble_outline</mat-icon>
            <span>No prompts available</span>
          </div>
        } @else if (filteredPrompts().length === 0) {
          <div class="empty-state">
            <mat-icon class="empty-icon">search_off</mat-icon>
            <span>No prompts match "{{ mcp.promptSearchQuery() }}"</span>
          </div>
        } @else {
          @for (prompt of filteredPrompts(); track prompt.name) {
            <div
              class="prompt-item"
              [class.active]="mcp.selectedPrompt()?.name === prompt.name"
              matRipple
              (click)="mcp.selectPrompt(prompt)"
            >
              <div class="prompt-name">{{ prompt.name }}</div>
              @if (prompt.description) {
                <div class="prompt-desc">{{ truncateDesc(prompt.description) }}</div>
              }
              @if (prompt.arguments && prompt.arguments.length > 0) {
                <div class="prompt-meta">
                  <span class="args-badge">{{ prompt.arguments!.length }} arg{{ prompt.arguments!.length > 1 ? 's' : '' }}</span>
                </div>
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

    .server-info {
      padding: 8px 16px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-tertiary);
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .info-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: var(--text-muted);
    }

    .server-name {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .server-version {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--text-muted);
    }

    .panel-body {
      flex: 1;
      overflow-y: auto;
      scrollbar-width: thin;
    }

    .prompt-item {
      padding: 10px 16px;
      border-bottom: 1px solid var(--border);
      cursor: pointer;
      border-left: 3px solid transparent;
      transition: background 0.1s, border-color 0.1s;

      &:hover { background: var(--bg-hover); }
      &.active {
        background: var(--active-bg);
        border-left-color: var(--active-border);
      }
    }

    .prompt-name {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 2px;
    }

    .prompt-desc {
      font-size: 11px;
      color: var(--text-secondary);
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-bottom: 4px;
    }

    .prompt-meta {
      display: flex;
      gap: 6px;
    }

    .args-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--accent-dim);
      color: var(--accent);
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

    .search-bar {
      padding: 8px 12px 4px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .search-field {
      width: 100%;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;

      ::ng-deep {
        .mat-mdc-form-field-infix {
          min-height: 32px;
          padding-top: 4px !important;
          padding-bottom: 4px !important;
        }
        .mat-mdc-text-field-wrapper {
          padding: 0 8px;
        }
        .mdc-notched-outline__leading,
        .mdc-notched-outline__notch,
        .mdc-notched-outline__trailing {
          border-color: var(--border) !important;
        }
        .mat-mdc-form-field-flex {
          align-items: center;
        }
        input.mat-mdc-input-element {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: var(--text-primary);
        }
      }
    }

    .search-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--text-muted);
      margin-right: 4px;
    }

    .clear-btn {
      width: 24px !important;
      height: 24px !important;
      line-height: 24px !important;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: var(--text-muted);
      }
    }
  `],
})
export class PromptsListComponent {
  readonly filteredPrompts = computed(() => {
    const query = this.mcp.promptSearchQuery().toLowerCase().trim();
    const prompts = this.mcp.prompts();
    if (!query) return prompts;
    return prompts.filter(p =>
      p.name.toLowerCase().includes(query) ||
      (p.description || '').toLowerCase().includes(query)
    );
  });

  constructor(public mcp: McpService) {}

  truncateDesc(desc: string): string {
    const firstLine = desc.split('\n')[0];
    return firstLine.length > 80 ? firstLine.substring(0, 80) + '...' : firstLine;
  }
}

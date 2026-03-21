import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatBadgeModule } from '@angular/material/badge';
import { McpService } from '../../services/mcp.service';

@Component({
  selector: 'app-tools-list',
  standalone: true,
  imports: [MatIconModule, MatRippleModule, MatBadgeModule],
  template: `
    <div class="panel">
      <div class="panel-header">
        <mat-icon class="header-icon">build</mat-icon>
        <span class="header-title">Tools</span>
        <span class="count-badge">{{ mcp.toolCount() }}</span>
      </div>

      @if (mcp.serverInfo(); as info) {
        <div class="server-info">
          <mat-icon class="info-icon">dns</mat-icon>
          <span class="server-name">{{ info.serverInfo?.name || 'Unknown' }}</span>
          <span class="server-version">v{{ info.serverInfo?.version || '?' }}</span>
        </div>
      }

      <div class="panel-body">
        @if (!mcp.connected()) {
          <div class="empty-state">
            <mat-icon class="empty-icon">power_off</mat-icon>
            <span>Connect to list tools</span>
          </div>
        } @else if (mcp.toolCount() === 0) {
          <div class="empty-state">
            <mat-icon class="empty-icon">inbox</mat-icon>
            <span>No tools registered</span>
          </div>
        } @else {
          @for (group of mcp.toolGroups(); track group.prefix) {
            <div class="tool-group">
              <div class="group-header" matRipple (click)="mcp.toggleGroup(group.prefix)">
                <mat-icon class="chevron">{{ isGroupCollapsed(group.prefix) ? 'chevron_right' : 'expand_more' }}</mat-icon>
                <span class="group-label">{{ group.label }}</span>
                <span class="group-count">{{ group.items.length }}</span>
              </div>
              @if (!isGroupCollapsed(group.prefix)) {
                @for (item of group.items; track item.globalIndex) {
                  <div
                    class="tool-item"
                    [class.active]="mcp.selectedToolIndex() === item.globalIndex"
                    matRipple
                    (click)="mcp.selectTool(item.globalIndex)"
                  >
                    <div class="tool-name">{{ getShortName(item.tool.name, group.prefix) }}</div>
                    @if (getDesc(item.tool)) {
                      <div class="tool-desc">{{ getDesc(item.tool) }}</div>
                    }
                    @if (getTags(item.tool); as tags) {
                      @if (tags.length) {
                        <div class="tool-tags">
                          @for (tag of tags; track tag) {
                            <span class="tag">{{ tag }}</span>
                          }
                        </div>
                      }
                    }
                  </div>
                }
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

    .count-badge {
      margin-left: auto;
      background: var(--accent-dim);
      color: var(--accent);
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
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

    .tool-group { border-bottom: 1px solid var(--border); }
    .tool-group:last-child { border-bottom: none; }

    .group-header {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 12px;
      background: var(--panel-header-bg);
      border-bottom: 1px solid var(--border);
      cursor: pointer;
      user-select: none;
    }

    .chevron {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--text-muted);
    }

    .group-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .group-count {
      margin-left: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: var(--text-muted);
      background: var(--bg-tertiary);
      padding: 1px 6px;
      border-radius: 8px;
    }

    .tool-item {
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

    .tool-name {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 2px;
    }

    .tool-desc {
      font-size: 11px;
      color: var(--text-secondary);
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .tool-tags { display: flex; gap: 4px; margin-top: 5px; flex-wrap: wrap; }

    .tag {
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
  `],
})
export class ToolsListComponent {
  constructor(public mcp: McpService) {}

  isGroupCollapsed(prefix: string): boolean {
    return this.mcp.collapsedGroups().has(prefix);
  }

  getShortName(name: string, prefix: string): string {
    return prefix ? name.substring(prefix.length + 1) : name;
  }

  getDesc(tool: { description?: string }): string {
    if (!tool.description) return '';
    return tool.description.split('\n')[0].slice(0, 100);
  }

  getTags(tool: { _meta?: { _fastmcp?: { tags?: string[] } } }): string[] {
    return tool._meta?._fastmcp?.tags || [];
  }
}

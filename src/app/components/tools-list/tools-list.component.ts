import { Component, computed, signal, ViewChild, ElementRef, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { McpService } from '../../services/mcp.service';

@Component({
  selector: 'app-tools-list',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatRippleModule, MatBadgeModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="panel">
      <div class="panel-body">
        @if (mcp.connected() && mcp.toolCount() > 0) {
          <div class="search-bar">
            <mat-form-field appearance="outline" class="search-field" subscriptSizing="dynamic">
              <mat-icon matPrefix class="search-icon">search</mat-icon>
              <input matInput
                #searchInput
                placeholder="Filter tools...  (/)"
                [ngModel]="mcp.searchQuery()"
                (ngModelChange)="mcp.searchQuery.set($event)">
              @if (mcp.searchQuery()) {
                <button mat-icon-button matSuffix (click)="mcp.searchQuery.set('')" class="clear-btn">
                  <mat-icon>close</mat-icon>
                </button>
              }
            </mat-form-field>
          </div>
        }

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
        } @else if (mcp.searchQuery() && filteredCount() === 0) {
          <div class="empty-state">
            <mat-icon class="empty-icon">search_off</mat-icon>
            <span>No tools match "{{ mcp.searchQuery() }}"</span>
          </div>
        } @else {
          @for (group of mcp.filteredToolGroups(); track group.prefix) {
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
                    [class.focused]="focusedIndex() === item.globalIndex"
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
      &.focused {
        outline: 2px solid var(--accent);
        outline-offset: -2px;
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
export class ToolsListComponent {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  readonly focusedIndex = signal(-1);

  readonly filteredCount = computed(() =>
    this.mcp.filteredToolGroups().reduce((sum, g) => sum + g.items.length, 0)
  );

  /** Flat list of visible (non-collapsed) tool global indices */
  private readonly visibleIndices = computed(() => {
    const indices: number[] = [];
    for (const group of this.mcp.filteredToolGroups()) {
      if (!this.isGroupCollapsed(group.prefix)) {
        for (const item of group.items) {
          indices.push(item.globalIndex);
        }
      }
    }
    return indices;
  });

  constructor(public mcp: McpService) {}

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    // Cmd+K / Ctrl+K or / for search focus
    if ((event.key === 'k' && (event.metaKey || event.ctrlKey)) ||
        (event.key === '/' && !this.isTyping(event))) {
      event.preventDefault();
      this.searchInput?.nativeElement?.focus();
      return;
    }

    // Arrow key navigation
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const indices = this.visibleIndices();
      if (indices.length === 0) return;

      event.preventDefault();
      const current = this.focusedIndex();
      const currentPos = indices.indexOf(current);

      let nextPos: number;
      if (event.key === 'ArrowDown') {
        nextPos = currentPos < 0 ? 0 : Math.min(currentPos + 1, indices.length - 1);
      } else {
        nextPos = currentPos <= 0 ? 0 : currentPos - 1;
      }
      this.focusedIndex.set(indices[nextPos]);
      return;
    }

    // Enter to select focused tool
    if (event.key === 'Enter' && !this.isTyping(event)) {
      const idx = this.focusedIndex();
      if (idx >= 0) {
        event.preventDefault();
        this.mcp.selectTool(idx);
      }
    }
  }

  private isTyping(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;
    const tag = target?.tagName?.toLowerCase();
    return tag === 'input' || tag === 'textarea' || target?.isContentEditable;
  }

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

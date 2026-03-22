import { Component, computed, ViewChild, ElementRef, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { McpService } from '../../services/mcp.service';
import { McpResource } from '../../models/mcp.models';

@Component({
  selector: 'app-resources-list',
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
        @if (mcp.connected() && mcp.resources().length > 0) {
          <div class="search-bar">
            <mat-form-field appearance="outline" class="search-field" subscriptSizing="dynamic">
              <mat-icon matPrefix class="search-icon">search</mat-icon>
              <input matInput
                #searchInput
                placeholder="Filter resources..."
                [ngModel]="mcp.resourceSearchQuery()"
                (ngModelChange)="mcp.resourceSearchQuery.set($event)">
              @if (mcp.resourceSearchQuery()) {
                <button mat-icon-button matSuffix (click)="mcp.resourceSearchQuery.set('')" class="clear-btn">
                  <mat-icon>close</mat-icon>
                </button>
              }
            </mat-form-field>
          </div>
        }

        @if (!mcp.connected()) {
          <div class="empty-state">
            <mat-icon class="empty-icon">power_off</mat-icon>
            <span>Connect to list resources</span>
          </div>
        } @else if (mcp.resources().length === 0) {
          <div class="empty-state">
            <mat-icon class="empty-icon">folder_off</mat-icon>
            <span>No resources available</span>
          </div>
        } @else if (filteredResources().length === 0) {
          <div class="empty-state">
            <mat-icon class="empty-icon">search_off</mat-icon>
            <span>No resources match "{{ mcp.resourceSearchQuery() }}"</span>
          </div>
        } @else {
          @for (resource of filteredResources(); track resource.uri) {
            <div
              class="resource-item"
              [class.active]="mcp.selectedResource()?.uri === resource.uri"
              matRipple
              (click)="mcp.selectResource(resource)"
            >
              <div class="resource-name">{{ resource.name }}</div>
              <div class="resource-uri">{{ resource.uri }}</div>
              <div class="resource-meta">
                @if (resource.mimeType) {
                  <span class="mime-badge">{{ resource.mimeType }}</span>
                }
                @if (resource.description) {
                  <span class="resource-desc">{{ truncateDesc(resource.description) }}</span>
                }
              </div>
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

    .resource-item {
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

    .resource-name {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 2px;
    }

    .resource-uri {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-bottom: 4px;
    }

    .resource-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .mime-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--accent-dim);
      color: var(--accent);
    }

    .resource-desc {
      font-size: 11px;
      color: var(--text-secondary);
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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
export class ResourcesListComponent {
  readonly filteredResources = computed(() => {
    const query = this.mcp.resourceSearchQuery().toLowerCase().trim();
    const resources = this.mcp.resources();
    if (!query) return resources;
    return resources.filter(r =>
      r.name.toLowerCase().includes(query) ||
      r.uri.toLowerCase().includes(query) ||
      (r.description || '').toLowerCase().includes(query)
    );
  });

  constructor(public mcp: McpService) {}

  truncateDesc(desc: string): string {
    return desc.length > 80 ? desc.substring(0, 80) + '...' : desc;
  }
}

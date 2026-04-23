import { Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { McpService } from '../../services/mcp.service';
import { ToolResponseComponent } from '../tool-response/tool-response.component';

@Component({
  selector: 'app-resource-detail',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, ToolResponseComponent],
  template: `
    <div class="panel">
      <div class="panel-header">
        <mat-icon class="header-icon">folder</mat-icon>
        <span class="header-title">Resource</span>
      </div>
      <div class="panel-body">
        @if (mcp.selectedResource(); as resource) {
          <div class="resource-detail">
            <div class="detail-title">{{ resource.name }}</div>
            <div class="detail-uri">{{ resource.uri }}</div>

            @if (resource.mimeType) {
              <div class="detail-meta">
                <span class="mime-badge">{{ resource.mimeType }}</span>
              </div>
            }

            @if (resource.description) {
              <div class="detail-desc">{{ resource.description }}</div>
            }

            <div class="call-actions">
              <button mat-flat-button class="call-btn"
                (click)="readResource()"
                [disabled]="reading()">
                <mat-icon>download</mat-icon>
                {{ reading() ? 'Reading...' : 'Read Resource' }}
              </button>
            </div>

            @if (mcp.resourceContent(); as result) {
              <app-tool-response [result]="result.data" [isError]="result.isError" />
            }
          </div>
        } @else {
          <div class="empty-state">
            <mat-icon class="empty-icon">folder_open</mat-icon>
            <span>Select a resource from the list</span>
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

    .resource-detail {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .detail-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 16px;
      font-weight: 700;
      color: var(--accent);
    }

    .detail-uri {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: var(--text-muted);
      word-break: break-all;
    }

    .detail-meta {
      display: flex;
      gap: 6px;
    }

    .mime-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--accent-dim);
      color: var(--accent);
    }

    .detail-desc {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.7;
      white-space: pre-wrap;
      padding: 12px;
      border-radius: 8px;
      background: var(--bg-tertiary);
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
export class ResourceDetailComponent {
  readonly reading = signal(false);

  constructor(public mcp: McpService) {}

  async readResource(): Promise<void> {
    const resource = this.mcp.selectedResource();
    if (!resource) return;
    this.reading.set(true);
    try {
      await this.mcp.readResource(resource.uri);
    } finally {
      this.reading.set(false);
    }
  }
}

import { Component, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { HeaderComponent } from './components/header/header.component';
import { ToolsListComponent } from './components/tools-list/tools-list.component';
import { ToolDetailComponent } from './components/tool-detail/tool-detail.component';
import { ResourcesListComponent } from './components/resources-list/resources-list.component';
import { ResourceDetailComponent } from './components/resource-detail/resource-detail.component';
import { PromptsListComponent } from './components/prompts-list/prompts-list.component';
import { PromptDetailComponent } from './components/prompt-detail/prompt-detail.component';
import { LogPanelComponent } from './components/log-panel/log-panel.component';
import { McpService } from './services/mcp.service';
import { SidebarTab } from './models/mcp.models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    MatIconModule, MatButtonToggleModule,
    HeaderComponent, ToolsListComponent, ToolDetailComponent,
    ResourcesListComponent, ResourceDetailComponent,
    PromptsListComponent, PromptDetailComponent,
    LogPanelComponent,
  ],
  template: `
    <div class="app">
      <app-header
        [toolsCollapsed]="toolsCollapsed()"
        [logCollapsed]="logCollapsed()"
        (toggleTools)="toolsCollapsed.set(!toolsCollapsed())"
        (toggleLog)="logCollapsed.set(!logCollapsed())"
      />
      <div class="main-content">
        @if (!toolsCollapsed()) {
          <div class="sidebar left">
            <div class="sidebar-header">
              @if (mcp.serverInfo(); as info) {
                <mat-icon class="header-icon">dns</mat-icon>
                <span class="server-name">{{ info.serverInfo?.name || 'MCP Server' }}</span>
                <span class="server-version">v{{ info.serverInfo?.version || '?' }}</span>
              } @else {
                <mat-icon class="header-icon">link_off</mat-icon>
                <span class="server-name">Not connected</span>
              }
            </div>
            <div class="sidebar-tabs">
              <mat-button-toggle-group [value]="mcp.activeTab()" (change)="onTabChange($event.value)" class="tab-toggles" hideSingleSelectionIndicator>
                <mat-button-toggle value="tools">
                  <mat-icon class="tab-icon">build</mat-icon>
                  <span class="tab-label">Tools</span>
                  @if (mcp.toolCount()) {
                    <span class="tab-badge">{{ mcp.toolCount() }}</span>
                  }
                </mat-button-toggle>
                <mat-button-toggle value="resources">
                  <mat-icon class="tab-icon">folder</mat-icon>
                  <span class="tab-label">Resources</span>
                  @if (mcp.resources().length) {
                    <span class="tab-badge">{{ mcp.resources().length }}</span>
                  }
                </mat-button-toggle>
                <mat-button-toggle value="prompts">
                  <mat-icon class="tab-icon">chat_bubble</mat-icon>
                  <span class="tab-label">Prompts</span>
                  @if (mcp.prompts().length) {
                    <span class="tab-badge">{{ mcp.prompts().length }}</span>
                  }
                </mat-button-toggle>
              </mat-button-toggle-group>
            </div>
            @switch (mcp.activeTab()) {
              @case ('tools') { <app-tools-list class="sidebar-content" /> }
              @case ('resources') { <app-resources-list class="sidebar-content" /> }
              @case ('prompts') { <app-prompts-list class="sidebar-content" /> }
            }
          </div>
        }
        <div class="center">
          @if (mcp.activeTab() === 'resources' && mcp.selectedResource()) {
            <app-resource-detail />
          } @else if (mcp.activeTab() === 'prompts' && mcp.selectedPrompt()) {
            <app-prompt-detail />
          } @else {
            <app-tool-detail />
          }
        </div>
        @if (!logCollapsed()) {
          <app-log-panel class="sidebar right" (closePanel)="logCollapsed.set(true)" />
        }
      </div>
    </div>
  `,
  styles: [`
    .app {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    .main-content {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .sidebar {
      width: 320px;
      min-width: 280px;
      max-width: 400px;
      flex-shrink: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;

      &.left {
        border-right: 1px solid var(--border);
      }

      &.right {
        border-left: 1px solid var(--border);
      }
    }

    .sidebar-header {
      flex-shrink: 0;
      padding: 12px 16px;
      background: var(--panel-header-bg);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--accent);
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

    .sidebar-tabs {
      flex-shrink: 0;
      padding: 8px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
    }

    .tab-toggles {
      width: 100%;
      display: flex;

      ::ng-deep .mat-button-toggle {
        flex: 1;
        height: 34px;

        .mat-button-toggle-label-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 0 6px;
          line-height: 34px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 600;
        }
      }

      ::ng-deep .mat-button-toggle-checked {
        background: var(--accent-dim) !important;
        color: var(--accent) !important;
      }
    }

    .tab-icon {
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
    }

    .tab-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .tab-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      font-weight: 600;
      background: var(--accent-dim);
      color: var(--accent);
      padding: 1px 5px;
      border-radius: 8px;
      margin-left: 2px;
    }

    .sidebar-content {
      flex: 1;
      min-height: 0;
      display: flex;
      overflow: hidden;
    }

    .center {
      flex: 1;
      min-width: 0;
      display: flex;
      overflow: hidden;
    }
  `],
})
export class App implements OnInit {
  readonly toolsCollapsed = signal(false);
  readonly logCollapsed = signal(false);

  constructor(public mcp: McpService) {}

  ngOnInit(): void {
    this.mcp.loadConfig();
  }

  onTabChange(tab: SidebarTab): void {
    this.mcp.activeTab.set(tab);
  }
}

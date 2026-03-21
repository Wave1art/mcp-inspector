import { Component, OnInit, signal } from '@angular/core';
import { HeaderComponent } from './components/header/header.component';
import { ToolsListComponent } from './components/tools-list/tools-list.component';
import { ToolDetailComponent } from './components/tool-detail/tool-detail.component';
import { LogPanelComponent } from './components/log-panel/log-panel.component';
import { McpService } from './services/mcp.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HeaderComponent, ToolsListComponent, ToolDetailComponent, LogPanelComponent],
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
          <app-tools-list class="sidebar left" />
        }
        <app-tool-detail class="center" />
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

      &.left {
        border-right: 1px solid var(--border);
      }

      &.right {
        border-left: 1px solid var(--border);
      }
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

  constructor(private mcp: McpService) {}

  ngOnInit(): void {
    this.mcp.loadConfig();
  }
}

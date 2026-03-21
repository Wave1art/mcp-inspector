import { Component, input, output } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../../services/theme.service';
import { McpService } from '../../services/mcp.service';
import { ConnectionFormComponent } from '../connection-form/connection-form.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatTooltipModule, ConnectionFormComponent],
  template: `
    <mat-toolbar class="header-toolbar">
      <button mat-icon-button
        (click)="toggleTools.emit()"
        [matTooltip]="toolsCollapsed() ? 'Show tools panel' : 'Hide tools panel'"
        class="panel-toggle">
        <mat-icon>{{ toolsCollapsed() ? 'menu' : 'menu_open' }}</mat-icon>
      </button>

      <span class="title">MCP Dev Inspector</span>

      <app-connection-form class="connection-area" />

      <div class="spacer"></div>

      <button mat-icon-button
        (click)="theme.toggle()"
        [matTooltip]="theme.theme() === 'light' ? 'Switch to dark mode' : 'Switch to light mode'">
        <mat-icon>{{ theme.theme() === 'light' ? 'dark_mode' : 'light_mode' }}</mat-icon>
      </button>

      @if (logCollapsed()) {
        <button mat-icon-button
          (click)="toggleLog.emit()"
          matTooltip="Show log panel"
          class="panel-toggle">
          <mat-icon>terminal</mat-icon>
        </button>
      }
    </mat-toolbar>
  `,
  styles: [`
    .header-toolbar {
      background: var(--bg-secondary) !important;
      border-bottom: 1px solid var(--border);
      box-shadow: var(--shadow-sm);
      color: var(--text-primary) !important;
      padding: 0 8px !important;
      height: 52px !important;
      gap: 4px;
    }

    .title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.3px;
      color: var(--accent);
      white-space: nowrap;
      margin-right: 8px;
    }

    .connection-area {
      flex: 1;
      min-width: 0;
    }

    .spacer {
      flex: 0;
    }

    .panel-toggle {
      color: var(--text-secondary) !important;
    }

    mat-icon {
      color: var(--text-secondary);
    }

    button:hover mat-icon {
      color: var(--text-primary);
    }
  `],
})
export class HeaderComponent {
  toolsCollapsed = input(false);
  logCollapsed = input(false);
  toggleTools = output();
  toggleLog = output();

  constructor(
    public theme: ThemeService,
    public mcp: McpService,
  ) {}
}

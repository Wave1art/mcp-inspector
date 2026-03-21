import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import { McpService } from '../../services/mcp.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-connection-form',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatRadioModule, MatTooltipModule],
  template: `
    <div class="form">
      <div class="url-wrap">
        <mat-icon class="url-icon">link</mat-icon>
        <input
          class="url-input"
          type="text"
          [ngModel]="urlValue()"
          (ngModelChange)="urlValue.set($event)"
          (blur)="onUrlChange()"
          (keydown.enter)="onUrlChange()"
          placeholder="MCP Server URL"
          [disabled]="mcp.connected()"
          spellcheck="false"
        />
      </div>

      <mat-radio-group
        class="auth-group"
        [ngModel]="auth.authMode()"
        (ngModelChange)="auth.setAuthMode($event)"
        [disabled]="mcp.connected()">
        <mat-radio-button value="none" class="auth-radio">No Auth</mat-radio-button>
        <mat-radio-button value="oauth" class="auth-radio">OAuth</mat-radio-button>
      </mat-radio-group>

      @if (auth.authMode() === 'oauth' && !mcp.connected()) {
        <div class="oauth-status">
          @switch (auth.authState()) {
            @case ('idle') {
              <button mat-stroked-button class="oauth-btn" (click)="startOAuth()">
                <mat-icon>key</mat-icon> Authorize
              </button>
            }
            @case ('discovering') {
              <span class="status-chip discovering">Discovering...</span>
            }
            @case ('authorizing') {
              <span class="status-chip authorizing">Awaiting consent...</span>
            }
            @case ('authenticated') {
              <span class="status-chip authenticated">
                <mat-icon class="check-icon">check_circle</mat-icon> Authorized
              </span>
            }
            @case ('error') {
              <span class="status-chip error" [matTooltip]="auth.errorMessage() || ''">Error</span>
              <button mat-icon-button (click)="startOAuth()" matTooltip="Retry"><mat-icon>refresh</mat-icon></button>
            }
          }
        </div>
      }

      <div class="connection-status">
        <div class="status-dot"
          [class.connected]="mcp.connected()"
          [class.error]="mcp.status() === 'error'"
          [class.connecting]="mcp.status() === 'connecting'">
        </div>

        @if (mcp.connected()) {
          <button mat-flat-button color="warn" class="conn-btn disconnect" (click)="mcp.disconnect()">
            Disconnect
          </button>
        } @else {
          <button mat-flat-button class="conn-btn connect"
            (click)="mcp.connect()"
            [disabled]="mcp.status() === 'connecting' || !auth.canConnect()">
            {{ mcp.status() === 'connecting' ? 'Connecting...' : 'Connect' }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; }

    .form {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 0;
    }

    .url-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      max-width: 340px;
      min-width: 180px;
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0 10px;
      transition: border-color 0.15s;

      &:focus-within {
        border-color: var(--accent);
        box-shadow: 0 0 0 2px var(--accent-dim);
      }
    }

    .url-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .url-input {
      flex: 1;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      padding: 7px 0;
      border: none;
      background: transparent;
      color: var(--text-primary);
      outline: none;
      min-width: 0;

      &:disabled { opacity: 0.5; }
      &::placeholder { color: var(--text-muted); }
    }

    .auth-group {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
    }

    .auth-radio {
      --mdc-radio-state-layer-size: 24px;

      ::ng-deep .mdc-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        color: var(--text-secondary);
      }
    }

    .oauth-status {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .oauth-btn {
      font-size: 10px;
      height: 28px;
      padding: 0 10px;
      line-height: 28px;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        margin-right: 4px;
      }
    }

    .status-chip {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      padding: 3px 8px;
      border-radius: 12px;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 4px;

      &.discovering, &.authorizing {
        background: var(--accent-dim);
        color: var(--accent);
      }
      &.authenticated {
        background: var(--green-dim);
        color: var(--green-text);
      }
      &.error {
        background: var(--red-dim);
        color: var(--red-text);
        cursor: help;
      }
    }

    .check-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--text-muted);
      transition: all 0.3s;

      &.connected { background: var(--green); box-shadow: 0 0 8px var(--green); }
      &.error { background: var(--red); box-shadow: 0 0 8px var(--red); }
      &.connecting { background: var(--amber); animation: pulse 1s infinite; }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .conn-btn {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      height: 30px;
      line-height: 30px;
      padding: 0 14px;
      border-radius: 6px;

      &.connect {
        background: var(--green) !important;
        color: #fff !important;
      }
      &.disconnect {
        background: var(--red-dim) !important;
        color: var(--red-text) !important;
        border: 1px solid var(--red) !important;
      }
    }
  `],
})
export class ConnectionFormComponent {
  urlValue = signal('');

  constructor(
    public mcp: McpService,
    public auth: AuthService,
  ) {
    this.urlValue.set(this.mcp.mcpUrl());
  }

  onUrlChange(): void {
    const url = this.urlValue().trim();
    if (url && url !== this.mcp.mcpUrl()) {
      this.mcp.updateMcpUrl(url);
    }
  }

  startOAuth(): void {
    this.auth.startOAuthFlow(this.mcp.mcpUrl());
  }
}

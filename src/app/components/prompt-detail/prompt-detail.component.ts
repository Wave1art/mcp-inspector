import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { McpService } from '../../services/mcp.service';
import { McpPromptMessage } from '../../models/mcp.models';

@Component({
  selector: 'app-prompt-detail',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="panel">
      <div class="panel-header">
        <mat-icon class="header-icon">chat_bubble</mat-icon>
        <span class="header-title">Prompt</span>
      </div>
      <div class="panel-body">
        @if (mcp.selectedPrompt(); as prompt) {
          <div class="prompt-detail">
            <div class="detail-title">{{ prompt.name }}</div>

            @if (prompt.description) {
              <div class="detail-desc">{{ prompt.description }}</div>
            }

            @if (prompt.arguments?.length) {
              <div class="args-section">
                <div class="section-label">
                  <mat-icon class="section-icon">tune</mat-icon>
                  Arguments
                </div>
                @for (arg of prompt.arguments; track arg.name) {
                  <mat-form-field appearance="outline" class="arg-field">
                    <mat-label>{{ arg.name }}{{ arg.required ? ' *' : '' }}</mat-label>
                    <input matInput
                      [ngModel]="argValues()[arg.name] || ''"
                      (ngModelChange)="setArgValue(arg.name, $event)">
                    @if (arg.description) {
                      <mat-hint>{{ arg.description }}</mat-hint>
                    }
                  </mat-form-field>
                }
              </div>
            }

            <div class="call-actions">
              <button mat-flat-button class="call-btn"
                (click)="getPrompt()"
                [disabled]="loading()">
                <mat-icon>send</mat-icon>
                {{ loading() ? 'Loading...' : 'Get Prompt' }}
              </button>
            </div>

            @if (mcp.promptMessages(); as messages) {
              <div class="messages-section">
                <div class="section-label">
                  <mat-icon class="section-icon">forum</mat-icon>
                  Messages ({{ messages.length }})
                </div>
                @for (msg of messages; track $index) {
                  <div class="message" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'" [class.error]="msg.role === 'error'">
                    <div class="message-role">{{ msg.role }}</div>
                    <div class="message-content">
                      <pre class="message-text">{{ getMessageText(msg) }}</pre>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        } @else {
          <div class="empty-state">
            <mat-icon class="empty-icon">chat_bubble_outline</mat-icon>
            <span>Select a prompt from the list</span>
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

    .prompt-detail {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .detail-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 16px;
      font-weight: 700;
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

    .args-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .section-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .section-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .arg-field {
      width: 100%;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;

      ::ng-deep .mdc-text-field--outlined {
        --mdc-outlined-text-field-container-shape: 8px;
      }

      ::ng-deep .mat-mdc-form-field-hint {
        font-size: 10px;
        color: var(--text-muted);
      }

      ::ng-deep .mat-mdc-floating-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
      }

      ::ng-deep input.mat-mdc-input-element {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
      }
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

    .messages-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
      border-top: 1px solid var(--border);
      padding-top: 16px;
    }

    .message {
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border);

      &.user {
        .message-role { background: var(--accent-dim); color: var(--accent); }
      }
      &.assistant {
        .message-role { background: var(--green-dim); color: var(--green-text); }
      }
      &.error {
        .message-role { background: var(--red-dim); color: var(--red-text); }
      }
    }

    .message-role {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 6px 12px;
      border-bottom: 1px solid var(--border);
    }

    .message-content {
      padding: 12px;
    }

    .message-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      line-height: 1.6;
      color: var(--text-primary);
      white-space: pre-wrap;
      word-break: break-word;
      margin: 0;
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
export class PromptDetailComponent {
  readonly loading = signal(false);
  readonly argValues = signal<Record<string, string>>({});
  private _lastPromptName: string | null = null;

  constructor(public mcp: McpService) {}

  ngDoCheck(): void {
    const prompt = this.mcp.selectedPrompt();
    const currentName = prompt?.name || null;
    if (currentName && currentName !== this._lastPromptName) {
      this._lastPromptName = currentName;
      // Initialize argument values
      const defaults: Record<string, string> = {};
      for (const arg of prompt?.arguments || []) {
        defaults[arg.name] = '';
      }
      this.argValues.set(defaults);
    }
  }

  setArgValue(name: string, value: string): void {
    this.argValues.update(v => ({ ...v, [name]: value }));
  }

  getMessageText(msg: McpPromptMessage): string {
    const content = msg.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.filter(c => c.text).map(c => c.text).join('\n');
    }
    // Single content object (FastMCP format)
    if (content && typeof content === 'object' && 'text' in content) {
      return (content as { text: string }).text;
    }
    return JSON.stringify(content, null, 2);
  }

  async getPrompt(): Promise<void> {
    const prompt = this.mcp.selectedPrompt();
    if (!prompt) return;
    this.loading.set(true);
    try {
      await this.mcp.getPrompt(prompt.name, this.argValues());
    } finally {
      this.loading.set(false);
    }
  }
}

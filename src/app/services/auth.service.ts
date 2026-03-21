import { Injectable, signal, computed } from '@angular/core';
import { AuthMode, AuthState, OAuthStatus } from '../models/mcp.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly authMode = signal<AuthMode>('none');
  readonly authState = signal<AuthState>('idle');
  readonly errorMessage = signal<string | null>(null);
  readonly tokenExpiresAt = signal<Date | null>(null);

  readonly isAuthenticated = computed(() => this.authState() === 'authenticated');
  readonly canConnect = computed(() =>
    this.authMode() === 'none' || this.authState() === 'authenticated'
  );

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  setAuthMode(mode: AuthMode): void {
    this.authMode.set(mode);
    if (mode === 'none') {
      this.clearAuth();
    } else {
      this.authState.set('idle');
    }
  }

  async startOAuthFlow(mcpServerUrl: string): Promise<void> {
    this.authState.set('discovering');
    this.errorMessage.set(null);

    try {
      const resp = await fetch('/api/oauth/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mcpUrl: mcpServerUrl }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Discovery failed' }));
        throw new Error(err.error || `Discovery failed (${resp.status})`);
      }

      const { authorizationUrl } = await resp.json();
      this.authState.set('authorizing');

      // Open authorization URL in new tab
      window.open(authorizationUrl, '_blank');

      // Start polling for callback completion
      this.startPolling();
    } catch (err) {
      this.authState.set('error');
      this.errorMessage.set(err instanceof Error ? err.message : 'OAuth discovery failed');
    }
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollTimer = setInterval(async () => {
      try {
        const resp = await fetch('/api/oauth/status');
        const status: OAuthStatus = await resp.json();

        if (status.state === 'authenticated') {
          this.authState.set('authenticated');
          if (status.token?.expiresAt) {
            this.tokenExpiresAt.set(new Date(status.token.expiresAt));
          }
          this.stopPolling();
        } else if (status.state === 'error') {
          this.authState.set('error');
          this.errorMessage.set(status.error || 'Authorization failed');
          this.stopPolling();
        }
      } catch {
        // Keep polling on network errors
      }
    }, 1500);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async refreshToken(): Promise<void> {
    try {
      const resp = await fetch('/api/oauth/refresh', { method: 'POST' });
      if (!resp.ok) throw new Error('Refresh failed');
      const status: OAuthStatus = await resp.json();
      if (status.token?.expiresAt) {
        this.tokenExpiresAt.set(new Date(status.token.expiresAt));
      }
    } catch (err) {
      this.authState.set('error');
      this.errorMessage.set('Token refresh failed');
    }
  }

  async clearAuth(): Promise<void> {
    this.stopPolling();
    this.authState.set('idle');
    this.errorMessage.set(null);
    this.tokenExpiresAt.set(null);
    try {
      await fetch('/api/oauth/revoke', { method: 'POST' });
    } catch {}
  }
}

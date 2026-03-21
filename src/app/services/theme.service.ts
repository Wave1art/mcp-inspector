import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<'light' | 'dark'>('light');

  constructor() {
    try {
      const saved = localStorage.getItem('mcp-inspector-theme') as 'light' | 'dark' | null;
      if (saved === 'light' || saved === 'dark') {
        this.theme.set(saved);
      }
    } catch {}

    effect(() => {
      const t = this.theme();
      document.documentElement.setAttribute('data-theme', t);
      try { localStorage.setItem('mcp-inspector-theme', t); } catch {}
    });
  }

  toggle(): void {
    this.theme.update(t => t === 'dark' ? 'light' : 'dark');
  }
}

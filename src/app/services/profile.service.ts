import { Injectable, signal } from '@angular/core';

export interface ConnectionProfile {
  name: string;
  mcpUrl: string;
  authMode: string;
}

const STORAGE_KEY = 'mcp-inspector-profiles';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  readonly profiles = signal<ConnectionProfile[]>(this.loadFromStorage());

  private loadFromStorage(): ConnectionProfile[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as ConnectionProfile[];
    } catch {}
    return [];
  }

  private saveToStorage(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profiles()));
  }

  getProfiles(): ConnectionProfile[] {
    return this.profiles();
  }

  addProfile(name: string, mcpUrl: string, authMode: string): void {
    this.profiles.update(list => {
      const filtered = list.filter(p => p.name !== name);
      return [...filtered, { name, mcpUrl, authMode }];
    });
    this.saveToStorage();
  }

  deleteProfile(name: string): void {
    this.profiles.update(list => list.filter(p => p.name !== name));
    this.saveToStorage();
  }
}

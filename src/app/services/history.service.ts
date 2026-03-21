import { Injectable, signal } from '@angular/core';

export interface HistoryEntry {
  id: number;
  toolName: string;
  args: string; // JSON string
  result: unknown;
  isError: boolean;
  durationMs?: number;
  timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private nextId = 0;
  readonly entries = signal<HistoryEntry[]>([]);

  readonly MAX_ENTRIES = 50;

  constructor() {
    this.loadFromStorage();
  }

  addEntry(toolName: string, args: string, result: unknown, isError: boolean, durationMs?: number): void {
    const entry: HistoryEntry = {
      id: this.nextId++,
      toolName,
      args,
      result,
      isError,
      durationMs,
      timestamp: new Date(),
    };
    this.entries.update(list => {
      const updated = [entry, ...list];
      return updated.slice(0, this.MAX_ENTRIES);
    });
    this.saveToStorage();
  }

  getEntriesForTool(toolName: string): HistoryEntry[] {
    return this.entries().filter(e => e.toolName === toolName);
  }

  clear(): void {
    this.entries.set([]);
    this.saveToStorage();
  }

  clearForTool(toolName: string): void {
    this.entries.update(list => list.filter(e => e.toolName !== toolName));
    this.saveToStorage();
  }

  private saveToStorage(): void {
    try {
      const data = this.entries().map(e => ({
        ...e,
        timestamp: e.timestamp.toISOString(),
      }));
      localStorage.setItem('mcp-inspector-history', JSON.stringify(data));
    } catch {}
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem('mcp-inspector-history');
      if (raw) {
        const data = JSON.parse(raw);
        this.entries.set(data.map((e: any, i: number) => ({
          ...e,
          id: i,
          timestamp: new Date(e.timestamp),
        })));
        this.nextId = data.length;
      }
    } catch {}
  }
}

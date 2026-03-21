import { Injectable, signal, computed } from '@angular/core';
import { LogEntry } from '../models/mcp.models';

@Injectable({ providedIn: 'root' })
export class LogService {
  private nextId = 0;
  readonly entries = signal<LogEntry[]>([]);
  readonly count = computed(() => this.entries().length);

  addEntry(direction: LogEntry['direction'], method: string, data: unknown): void {
    const entry: LogEntry = {
      direction,
      method,
      data,
      timestamp: new Date(),
      id: this.nextId++,
    };
    this.entries.update(list => [entry, ...list]);
  }

  clear(): void {
    this.entries.set([]);
  }
}

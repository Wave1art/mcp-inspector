import { Injectable, signal, computed } from '@angular/core';
import { LogEntry } from '../models/mcp.models';

@Injectable({ providedIn: 'root' })
export class LogService {
  private nextId = 0;
  private outTimestamps = new Map<number, number>(); // JSON-RPC id -> performance.now()

  readonly entries = signal<LogEntry[]>([]);
  readonly count = computed(() => this.entries().length);

  // Filter signals
  readonly directionFilter = signal<Set<LogEntry['direction']>>(new Set(['out', 'in', 'err']));
  readonly methodFilter = signal('');

  readonly filteredEntries = computed(() => {
    const all = this.entries();
    const dirs = this.directionFilter();
    const method = this.methodFilter().toLowerCase().trim();

    return all.filter(entry => {
      if (!dirs.has(entry.direction)) return false;
      if (method && !entry.method.toLowerCase().includes(method)) return false;
      return true;
    });
  });

  addEntry(direction: LogEntry['direction'], method: string, data: unknown): void {
    let durationMs: number | undefined;

    // Track outgoing request timestamps by JSON-RPC id
    if (direction === 'out') {
      const id = (data as Record<string, unknown>)?.['id'] as number | undefined;
      if (id !== undefined) {
        this.outTimestamps.set(id, performance.now());
      }
    }

    // Calculate duration for incoming responses
    if (direction === 'in') {
      const id = (data as Record<string, unknown>)?.['id'] as number | undefined;
      if (id !== undefined && this.outTimestamps.has(id)) {
        durationMs = Math.round(performance.now() - this.outTimestamps.get(id)!);
        this.outTimestamps.delete(id);
      }
    }

    const entry: LogEntry = {
      direction,
      method,
      data,
      timestamp: new Date(),
      id: this.nextId++,
      durationMs,
    };
    this.entries.update(list => [entry, ...list]);
  }

  clear(): void {
    this.entries.set([]);
    this.outTimestamps.clear();
  }
}

// StateTimeline.ts - Server-side debugger state timeline storage

export type TimelineEvent = {
  timestamp: number;
  type: "compilation" | "debugger_snapshot" | "hot_reload";
  targetName: string;
  data: CompilationData | DebuggerSnapshot | HotReloadData;
};

export type DebuggerSnapshot = {
  targetName: string;
  timestamp: number;
  model: unknown;
  history: {
    numMessages: number;
    recent: Array<unknown>;
    snapshots: Array<unknown>;
  } | null;
  state: unknown;
  programType: string;
};

export type CompilationData = {
  status: "success" | "error";
  errors?: Array<string>;
};

export type HotReloadData = {
  status: "success" | "skipped";
};

export type TimelineQuery = {
  startTime?: number;
  endTime?: number;
  targetName?: string;
  eventType?: TimelineEvent["type"];
  limit?: number;
};

export class StateTimeline {
  private events: Array<TimelineEvent>;
  private maxSize: number;
  private head: number;
  private size: number;

  constructor(maxSize: number = 10000) {
    this.events = new Array(maxSize);
    this.maxSize = maxSize;
    this.head = 0;
    this.size = 0;
  }

  append(event: TimelineEvent): void {
    this.events[this.head] = event;
    this.head = (this.head + 1) % this.maxSize;
    if (this.size < this.maxSize) {
      this.size++;
    }
  }

  query(query: TimelineQuery): Array<TimelineEvent> {
    const results: Array<TimelineEvent> = [];
    const limit = query.limit ?? 100;

    for (let i = 0; i < this.size; i++) {
      const index = (this.head - 1 - i + this.maxSize) % this.maxSize;
      const event = this.events[index];

      if (!event) continue;

      // Apply filters
      if (query.startTime !== undefined && event.timestamp < query.startTime)
        continue;
      if (query.endTime !== undefined && event.timestamp > query.endTime)
        continue;
      if (query.targetName !== undefined && event.targetName !== query.targetName)
        continue;
      if (query.eventType !== undefined && event.type !== query.eventType)
        continue;

      results.push(event);

      if (results.length >= limit) break;
    }

    return results;
  }

  getSnapshot(targetName: string): DebuggerSnapshot | null {
    for (let i = 0; i < this.size; i++) {
      const index = (this.head - 1 - i + this.maxSize) % this.maxSize;
      const event = this.events[index];

      if (
        event?.type === "debugger_snapshot" &&
        event.targetName === targetName
      ) {
        return event.data as DebuggerSnapshot;
      }
    }
    return null;
  }

  clear(): void {
    this.events = new Array(this.maxSize);
    this.head = 0;
    this.size = 0;
  }
}

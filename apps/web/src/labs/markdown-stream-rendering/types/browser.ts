import type { BenchmarkLongTaskSummary } from './benchmark';

export interface LongTaskEntry {
  duration: number;
}

export interface LongTaskMonitor {
  finish: () => BenchmarkLongTaskSummary;
}

import type { LongTaskEntry, LongTaskMonitor } from '../types/browser';

export const startLongTaskMonitor = (): LongTaskMonitor => {
  if (typeof PerformanceObserver === 'undefined') {
    return createUnsupportedMonitor();
  }
  const durations: number[] = [];
  let observer: PerformanceObserver;
  try {
    observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        durations.push(entry.duration);
      });
    });
    observer.observe({
      entryTypes: ['longtask'],
    });
  } catch {
    return createUnsupportedMonitor();
  }
  return {
    finish: () => {
      observer.takeRecords().forEach((entry: LongTaskEntry) => {
        durations.push(entry.duration);
      });
      observer.disconnect();
      return {
        count: durations.length,
        maxMs: durations.length === 0 ? 0 : Math.max(...durations),
        supported: true,
        totalMs: durations.reduce((total, duration) => {
          return total + duration;
        }, 0),
      };
    },
  };
};
const createUnsupportedMonitor = (): LongTaskMonitor => {
  return {
    finish: () => {
      return {
        count: 0,
        maxMs: 0,
        supported: false,
        totalMs: 0,
      };
    },
  };
};

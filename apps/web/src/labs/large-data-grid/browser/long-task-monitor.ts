import type { GridLongTaskMonitor } from '../types/benchmark';

export const startGridLongTaskMonitor = (): GridLongTaskMonitor => {
  if (typeof PerformanceObserver === 'undefined') {
    return {
      finish: () => {
        return {
          count: 0,
          maximumMs: 0,
          supported: false,
          totalMs: 0,
        };
      },
    };
  }
  const durations: number[] = [];
  let observer: PerformanceObserver | null = null;
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
    observer = null;
  }
  return {
    finish: () => {
      if (!observer) {
        return {
          count: 0,
          maximumMs: 0,
          supported: false,
          totalMs: 0,
        };
      }
      observer.takeRecords().forEach((entry) => {
        durations.push(entry.duration);
      });
      observer.disconnect();
      return {
        count: durations.length,
        maximumMs: Math.max(0, ...durations),
        supported: true,
        totalMs: durations.reduce((sum, duration) => {
          return sum + duration;
        }, 0),
      };
    },
  };
};

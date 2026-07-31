import type { FrameClock } from '../types/renderer';

export class LatestFrameScheduler<T> {
  private disposed = false;
  private frameHandle: number | null = null;
  private latest: T | null = null;
  constructor(
    private readonly clock: FrameClock,
    private readonly draw: (value: T, timestamp: number) => void,
  ) {}
  push = (value: T): void => {
    if (this.disposed) {
      return;
    }
    this.latest = value;
    if (this.frameHandle !== null) {
      return;
    }
    this.frameHandle = this.clock.request((timestamp) => {
      this.flush(timestamp);
    });
  };
  dispose = (): void => {
    this.disposed = true;
    this.latest = null;
    if (this.frameHandle !== null) {
      this.clock.cancel(this.frameHandle);
      this.frameHandle = null;
    }
  };
  private flush = (timestamp: number): void => {
    this.frameHandle = null;
    const next = this.latest;
    this.latest = null;
    if (this.disposed || next === null) {
      return;
    }
    this.draw(next, timestamp);
    if (this.latest !== null && this.frameHandle === null) {
      this.frameHandle = this.clock.request((nextTimestamp) => {
        this.flush(nextTimestamp);
      });
    }
  };
}
export const createWindowFrameClock = (): FrameClock => {
  return {
    cancel: (frameId) => {
      window.cancelAnimationFrame(frameId);
    },
    request: (callback) => {
      return window.requestAnimationFrame(callback);
    },
  };
};

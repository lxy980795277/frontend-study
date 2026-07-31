import type { FrameClock } from '../../types/renderer';
import { LatestFrameScheduler } from '../frame-scheduler';
describe('LatestFrameScheduler', () => {
  it('draws only the latest value queued before a frame', () => {
    let callback: ((timestamp: number) => void) | null = null;
    const requestFrame = (nextCallback: (timestamp: number) => void): number => {
      callback = nextCallback;
      return 7;
    };
    const request = vi.fn(requestFrame);
    const clock: FrameClock = {
      cancel: vi.fn(),
      request,
    };
    const draw = vi.fn();
    const scheduler = new LatestFrameScheduler(clock, draw);
    scheduler.push('first');
    scheduler.push('second');
    const runFrame = callback as unknown as (timestamp: number) => void;
    runFrame(12);
    expect(draw).toHaveBeenCalledOnce();
    expect(draw).toHaveBeenCalledWith('second', 12);
    expect(request).toHaveBeenCalledOnce();
  });
  it('cancels an outstanding frame and ignores later values after dispose', () => {
    const clock: FrameClock = {
      cancel: vi.fn(),
      request: vi.fn(() => {
        return 11;
      }),
    };
    const draw = vi.fn();
    const scheduler = new LatestFrameScheduler(clock, draw);
    scheduler.push('queued');
    scheduler.dispose();
    scheduler.push('ignored');
    expect(clock.cancel).toHaveBeenCalledWith(11);
    expect(clock.request).toHaveBeenCalledOnce();
    expect(draw).not.toHaveBeenCalled();
  });
});

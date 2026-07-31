import { act, fireEvent, render } from '@testing-library/react';
import { StickToBottomViewport } from '..';
import { resolveStickToBottomState } from '@/labs/markdown-stream-rendering/hooks/use-stick-to-bottom';
class TestResizeObserver {
  static instances: TestResizeObserver[] = [];
  readonly disconnect = vi.fn();
  readonly observe = vi.fn();
  constructor(private readonly callback: ResizeObserverCallback) {
    TestResizeObserver.instances.push(this);
  }
  trigger = (): void => {
    this.callback([], this as unknown as ResizeObserver);
  };
}
describe('StickToBottomViewport', () => {
  let animationFrames: Map<number, FrameRequestCallback>;
  let frameSequence: number;
  beforeEach(() => {
    animationFrames = new Map();
    frameSequence = 0;
    TestResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', TestResizeObserver);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frameSequence += 1;
      animationFrames.set(frameSequence, callback);
      return frameSequence;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((frameId) => {
      animationFrames.delete(frameId);
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  it('uses hysteresis when entering and leaving the bottom region', () => {
    expect(resolveStickToBottomState(true, 30)).toBe(true);
    expect(resolveStickToBottomState(true, 49)).toBe(false);
    expect(resolveStickToBottomState(false, 30)).toBe(false);
    expect(resolveStickToBottomState(false, 16)).toBe(true);
  });
  it('follows new content, pauses for upward reading, and resumes at the bottom', async () => {
    const { getByTestId, rerender } = render(
      <StickToBottomViewport testId="viewport">
        <p>first</p>
      </StickToBottomViewport>,
    );
    const viewport = getByTestId('viewport');
    let scrollHeight = 400;
    Object.defineProperties(viewport, {
      clientHeight: {
        configurable: true,
        get: () => {
          return 100;
        },
      },
      scrollHeight: {
        configurable: true,
        get: () => {
          return scrollHeight;
        },
      },
    });
    flushAnimationFrames(animationFrames);
    expect(viewport.scrollTop).toBe(400);
    viewport.scrollTop = 120;
    fireEvent.scroll(viewport);
    scrollHeight = 500;
    rerender(
      <StickToBottomViewport testId="viewport">
        <p>second</p>
      </StickToBottomViewport>,
    );
    await flushMutationObserver();
    flushAnimationFrames(animationFrames);
    expect(viewport.scrollTop).toBe(120);
    viewport.scrollTop = 400;
    fireEvent.scroll(viewport);
    scrollHeight = 600;
    rerender(
      <StickToBottomViewport testId="viewport">
        <p>third</p>
      </StickToBottomViewport>,
    );
    await flushMutationObserver();
    flushAnimationFrames(animationFrames);
    expect(viewport.scrollTop).toBe(600);
  });
  it('coalesces observer work and releases scheduled resources on unmount', () => {
    const { unmount } = render(
      <StickToBottomViewport testId="viewport">
        <p>content</p>
      </StickToBottomViewport>,
    );
    const observer = TestResizeObserver.instances[0];
    expect(observer).toBeDefined();
    observer?.trigger();
    observer?.trigger();
    expect(animationFrames.size).toBe(1);
    unmount();
    expect(animationFrames.size).toBe(0);
    expect(observer?.disconnect).toHaveBeenCalledOnce();
  });
});
const flushAnimationFrames = (animationFrames: Map<number, FrameRequestCallback>): void => {
  act(() => {
    const callbacks = Array.from(animationFrames.values());
    animationFrames.clear();
    callbacks.forEach((callback) => {
      callback(performance.now());
    });
  });
};
const flushMutationObserver = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

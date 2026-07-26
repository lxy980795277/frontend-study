'use client';

import { useEffect, useRef, type RefObject } from 'react';

const DEFAULT_ENTER_THRESHOLD = 16;
const DEFAULT_LEAVE_THRESHOLD = 48;

interface StickToBottomOptions {
  enterThreshold?: number;
  leaveThreshold?: number;
}

interface StickToBottomRefs {
  contentRef: RefObject<HTMLDivElement | null>;
  viewportRef: RefObject<HTMLDivElement | null>;
}

export function resolveStickToBottomState(
  following: boolean,
  distanceFromBottom: number,
  enterThreshold = DEFAULT_ENTER_THRESHOLD,
  leaveThreshold = DEFAULT_LEAVE_THRESHOLD,
): boolean {
  if (following) {
    return distanceFromBottom <= leaveThreshold;
  }

  return distanceFromBottom <= enterThreshold;
}

export function useStickToBottom(options: StickToBottomOptions = {}): StickToBottomRefs {
  const contentRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const followingRef = useRef(true);
  const frameRef = useRef<number | null>(null);
  const enterThreshold = options.enterThreshold ?? DEFAULT_ENTER_THRESHOLD;
  const leaveThreshold = options.leaveThreshold ?? DEFAULT_LEAVE_THRESHOLD;

  useEffect(() => {
    const content = contentRef.current;
    const viewport = viewportRef.current;
    if (!content || !viewport) {
      return;
    }

    const setFollowing = (following: boolean): void => {
      followingRef.current = following;
      viewport.dataset.stickToBottom = following ? 'following' : 'paused';
    };

    const updateFollowingFromScroll = (): void => {
      const distanceFromBottom = Math.max(0, viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight);
      setFollowing(resolveStickToBottomState(followingRef.current, distanceFromBottom, enterThreshold, leaveThreshold));
    };

    const scheduleFollow = (): void => {
      if (!followingRef.current) {
        return;
      }

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        if (!followingRef.current) {
          return;
        }

        viewport.scrollTop = viewport.scrollHeight;
      });
    };

    setFollowing(true);
    viewport.addEventListener('scroll', updateFollowingFromScroll, {
      passive: true,
    });

    const mutationObserver = new MutationObserver(scheduleFollow);
    mutationObserver.observe(content, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleFollow);
      resizeObserver.observe(content);
      resizeObserver.observe(viewport);
    }

    scheduleFollow();

    return () => {
      viewport.removeEventListener('scroll', updateFollowingFromScroll);
      mutationObserver.disconnect();
      resizeObserver?.disconnect();

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [enterThreshold, leaveThreshold]);

  return {
    contentRef,
    viewportRef,
  };
}

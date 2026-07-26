'use client';

import type { FC, ReactNode } from 'react';

import { cn } from '@/utils/cn';

import { useStickToBottom } from '../../hooks/use-stick-to-bottom';

interface StickToBottomViewportProps {
  children: ReactNode;
  className?: string;
  testId: string;
}

export const StickToBottomViewport: FC<StickToBottomViewportProps> = ({ children, className, testId }) => {
  const { contentRef, viewportRef } = useStickToBottom();

  return (
    <div
      ref={viewportRef}
      className={cn('min-h-0 min-w-0 overflow-x-hidden overflow-y-auto', className)}
      data-testid={testId}
    >
      <div ref={contentRef} className="min-h-full min-w-0">
        {children}
      </div>
    </div>
  );
};

import type { FC, ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';

import { StickToBottomViewport } from '../stick-to-bottom-viewport';

interface RendererPanelProps {
  children: ReactNode[];
  description: string;
  instanceCount: 1 | 4;
  runId: number;
  title: string;
  variant: 'incremental' | 'legacy';
}

export const RendererPanel: FC<RendererPanelProps> = ({
  children,
  description,
  instanceCount,
  runId,
  title,
  variant,
}) => {
  const badgeLabel = variant === 'legacy' ? 'FULL RENDER' : 'WORKER + PATCH';

  return (
    <section
      className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm"
      data-renderer-panel={variant}
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 truncate text-xs text-muted-foreground" title={description}>
            {description}
          </p>
        </div>
        <Badge className="shrink-0 font-mono text-[0.625rem]" variant="secondary">
          {badgeLabel}
        </Badge>
      </header>

      <div
        data-testid={`${variant}-instances`}
        className={cn(
          'min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3',
          instanceCount === 1 && 'grid grid-cols-1',
          instanceCount === 4 && 'grid auto-rows-[21rem] grid-cols-1 gap-3 2xl:grid-cols-2',
        )}
      >
        {children.map((child, index) => {
          return (
            <article
              key={`${variant}-${runId}-${index}`}
              className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border bg-background"
            >
              <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/30 px-3">
                <span className="font-mono text-[0.625rem] text-muted-foreground">instance-{index + 1}</span>
                <span aria-label="运行中" className="size-1.5 rounded-full bg-success" />
              </div>
              <StickToBottomViewport className="flex-1 p-4" testId={`${variant}-scroll-viewport-${index}`}>
                {child}
              </StickToBottomViewport>
            </article>
          );
        })}
      </div>
    </section>
  );
};

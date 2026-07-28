'use client';

import type { FC } from 'react';
import { useCallback, useRef } from 'react';

import { Badge } from '@/components/ui/badge';

import { createVisibleContentHash } from '../../benchmark/report';
import type { BenchmarkActiveExecution, BenchmarkRendererCommit, RendererCommit } from '../../benchmark/types';
import type { PatchResult } from '../../core/patch/types';
import type { IncrementalSample, LegacySample, RuntimeStatus } from '../../metrics/types';
import { IncrementalRenderer } from '../incremental-renderer';
import { LegacyRenderer } from '../legacy-renderer';

interface SingleRendererHostProps {
  activeExecution: BenchmarkActiveExecution;
  content: string;
  onCoalescedFrame: () => void;
  onCommit: (commit: BenchmarkRendererCommit) => void;
  onIncrementalSample: (sample: IncrementalSample) => void;
  onLegacySample: (sample: LegacySample) => void;
  onPatch: (result: PatchResult) => void;
  onRuntimeStatus: (status: RuntimeStatus) => void;
  onWorkerRequest: () => void;
}

export const SingleRendererHost: FC<SingleRendererHostProps> = ({
  activeExecution,
  content,
  onCoalescedFrame,
  onCommit,
  onIncrementalSample,
  onLegacySample,
  onPatch,
  onRuntimeStatus,
  onWorkerRequest,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const renderer = activeExecution.execution.renderer;
  const rendererTitle = {
    incremental: 'Incremental 增量渲染',
    legacy: 'Legacy 全量渲染',
  }[renderer];
  const executionLabel = `ROUND ${String(activeExecution.execution.round)}`;
  const handleCommit = useCallback(
    (commit: RendererCommit) => {
      const contentHash =
        commit.contentLength === activeExecution.finalContentLength
          ? readVisibleContentHash(hostRef.current, renderer)
          : null;

      onCommit({
        ...commit,
        contentHash,
      });
    },
    [activeExecution.finalContentLength, onCommit, renderer],
  );

  let rendererNode = <LegacyRenderer content={content} onCommit={handleCommit} onSample={onLegacySample} />;

  if (renderer === 'incremental') {
    rendererNode = (
      <IncrementalRenderer
        content={content}
        failureSignal={0}
        onCoalescedFrame={onCoalescedFrame}
        onCommit={handleCommit}
        onFallback={NOOP}
        onPatch={onPatch}
        onSample={onIncrementalSample}
        onStatus={onRuntimeStatus}
        onWorkerRequest={onWorkerRequest}
      />
    );
  }

  return (
    <section
      className="flex h-[32rem] min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm"
      data-benchmark-renderer={renderer}
      data-testid="isolated-renderer-host"
    >
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{rendererTitle}</p>
        </div>
        <Badge className="font-mono text-[0.625rem]" variant="secondary">
          {executionLabel}
        </Badge>
      </header>
      <div ref={hostRef} className="min-h-0 flex-1 overflow-auto p-4" data-testid="isolated-renderer-viewport">
        {rendererNode}
      </div>
    </section>
  );
};

const NOOP = (): void => {
  return undefined;
};

function readVisibleContentHash(host: HTMLDivElement | null, renderer: 'incremental' | 'legacy'): string {
  if (!host) {
    return '';
  }

  if (renderer === 'legacy') {
    const legacyContainer = host.querySelector('[data-testid="legacy-renderer"]');
    const visibleContent = Array.from(legacyContainer?.children ?? [])
      .map((node) => {
        return node.textContent ?? '';
      })
      .join('\n');

    return createVisibleContentHash(visibleContent);
  }

  const visibleContent = Array.from(host.querySelectorAll('.msr-content, .msr-fallback-content'))
    .map((node) => {
      return node.textContent ?? '';
    })
    .join('\n');

  return createVisibleContentHash(visibleContent);
}

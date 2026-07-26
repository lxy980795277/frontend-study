'use client';

import type { FC } from 'react';
import { useCallback } from 'react';

import type { PatchResult } from '../../core/patch/types';
import type { IncrementalSample, LegacySample, RuntimeStatus } from '../../metrics/types';
import { IncrementalRenderer } from '../incremental-renderer';
import { LegacyRenderer } from '../legacy-renderer';
import { RendererPanel } from '../renderer-panel';

interface ComparePaneProps {
  content: string;
  failureSignal: number;
  instanceCount: 1 | 4;
  runId: number;
  onCoalescedFrame: () => void;
  onIncrementalSample: (sample: IncrementalSample) => void;
  onLegacySample: (sample: LegacySample) => void;
  onPatch: (result: PatchResult) => void;
  onRuntimeStatus: (instance: number, status: RuntimeStatus) => void;
  onWorkerRequest: () => void;
}

export const ComparePane: FC<ComparePaneProps> = ({
  content,
  failureSignal,
  instanceCount,
  runId,
  onCoalescedFrame,
  onIncrementalSample,
  onLegacySample,
  onPatch,
  onRuntimeStatus,
  onWorkerRequest,
}) => {
  const instances = Array.from({ length: instanceCount }, (_, index) => index);

  const legacyRenderers = instances.map((instance) => {
    return <LegacyRenderer key={`legacy-${runId}-${instance}`} content={content} onSample={onLegacySample} />;
  });

  const incrementalRenderers = instances.map((instance) => {
    return (
      <IncrementalRendererInstance
        key={`incremental-${runId}-${instance}`}
        content={content}
        failureSignal={instance === 0 ? failureSignal : 0}
        instance={instance}
        onCoalescedFrame={onCoalescedFrame}
        onPatch={onPatch}
        onRuntimeStatus={onRuntimeStatus}
        onSample={onIncrementalSample}
        onWorkerRequest={onWorkerRequest}
      />
    );
  });

  return (
    <div
      className="grid h-[66rem] min-h-0 min-w-0 grid-cols-1 gap-4 lg:h-[42rem] lg:grid-cols-2 xl:h-full"
      data-testid="markdown-compare-pane"
    >
      <RendererPanel
        description="主线程 markdown-it + DOMPurify + innerHTML"
        instanceCount={instanceCount}
        runId={runId}
        title="Legacy 全量渲染"
        variant="legacy"
      >
        {legacyRenderers}
      </RendererPanel>
      <RendererPanel
        description="Worker 解析 / Diff，主线程应用最小 Patch"
        instanceCount={instanceCount}
        runId={runId}
        title="Incremental 增量渲染"
        variant="incremental"
      >
        {incrementalRenderers}
      </RendererPanel>
    </div>
  );
};

interface IncrementalRendererInstanceProps {
  content: string;
  failureSignal: number;
  instance: number;
  onCoalescedFrame: () => void;
  onPatch: (result: PatchResult) => void;
  onRuntimeStatus: (instance: number, status: RuntimeStatus) => void;
  onSample: (sample: IncrementalSample) => void;
  onWorkerRequest: () => void;
}

const IncrementalRendererInstance: FC<IncrementalRendererInstanceProps> = ({
  content,
  failureSignal,
  instance,
  onCoalescedFrame,
  onPatch,
  onRuntimeStatus,
  onSample,
  onWorkerRequest,
}) => {
  const handleStatus = useCallback(
    (status: RuntimeStatus) => {
      onRuntimeStatus(instance, status);
    },
    [instance, onRuntimeStatus],
  );
  const handleFallback = useCallback(() => {
    return undefined;
  }, []);

  return (
    <IncrementalRenderer
      content={content}
      failureSignal={failureSignal}
      onCoalescedFrame={onCoalescedFrame}
      onFallback={handleFallback}
      onPatch={onPatch}
      onSample={onSample}
      onStatus={handleStatus}
      onWorkerRequest={onWorkerRequest}
    />
  );
};

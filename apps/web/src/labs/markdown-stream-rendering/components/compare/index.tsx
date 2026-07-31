'use client';

import { Info } from 'lucide-react';
import type { FC } from 'react';

import { Inspector } from '@/labs/markdown-stream-rendering/components/compare/inspector';
import { ControlBar } from '@/labs/markdown-stream-rendering/components/compare/controls';
import { ComparePane } from '@/labs/markdown-stream-rendering/components/compare/pane';
import { BaselineStatus } from '@/labs/markdown-stream-rendering/components/compare/status';
import { MARKDOWN_FIXTURES } from '@/labs/markdown-stream-rendering/fixtures/fixtures';
import { useMarkdownStreamLab } from '@/labs/markdown-stream-rendering/hooks/use-markdown-stream-lab';

export const ConcurrentComparison: FC = () => {
  const lab = useMarkdownStreamLab();
  const { actions, activeFixture, state } = lab;
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
        <Info aria-hidden className="mt-0.5 size-3.5 shrink-0 text-primary" />
        <p className="leading-5 text-muted-foreground">
          当前为共存负载：两种 Renderer 同时争用主线程与帧预算，适合验证结果一致性、Patch 和交互，不代表各自独立性能。
        </p>
      </div>

      <ControlBar
        configuration={state.configuration}
        fixtureId={state.fixtureId}
        fixtures={MARKDOWN_FIXTURES}
        instanceCount={state.instanceCount}
        isPlaying={state.isPlaying}
        phase={state.benchmark.phase}
        onFailure={actions.injectWorkerFailure}
        onFpsChange={actions.setFps}
        onInstanceCountChange={actions.setInstanceCount}
        onReset={actions.reset}
        onSelectFixture={actions.selectFixture}
        onSplitModeChange={actions.setSplitMode}
        onTogglePlayback={actions.togglePlayback}
      />

      <BaselineStatus benchmark={state.benchmark} onRetry={actions.retryBaseline} />

      <div className="grid min-h-0 min-w-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-h-0 min-w-0">
          <ComparePane
            content={state.content}
            failureSignal={state.failureSignal}
            instanceCount={state.instanceCount}
            runId={state.runId}
            onCoalescedFrame={actions.onCoalescedFrame}
            onIncrementalSample={actions.onIncrementalSample}
            onLegacySample={actions.onLegacySample}
            onPatch={actions.onPatch}
            onRuntimeStatus={actions.onRuntimeStatus}
            onWorkerRequest={actions.onWorkerRequest}
          />
        </div>

        <Inspector
          fixture={activeFixture}
          instanceCount={state.instanceCount}
          metrics={state.metrics}
          patchLog={state.patchLog}
          runtimeStatuses={state.runtimeStatuses}
        />
      </div>
    </div>
  );
};

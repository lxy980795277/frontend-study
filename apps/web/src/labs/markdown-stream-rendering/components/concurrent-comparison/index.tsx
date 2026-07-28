'use client';

import { Activity, Braces, Cpu, Info } from 'lucide-react';
import type { FC } from 'react';

import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { MARKDOWN_FIXTURES } from '../../fixtures/fixtures';
import { useMarkdownStreamLab } from '../../hooks/use-markdown-stream-lab';
import { BaselineStatus } from '../baseline-status';
import { ComparePane } from '../compare-pane';
import { ControlBar } from '../control-bar';
import { MetricsPanel } from '../metrics-panel';
import { PatchLog } from '../patch-log';
import { RuntimePanel } from '../runtime-panel';

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

        <Card className="flex min-h-[32rem] min-w-0 flex-col overflow-hidden p-3 xl:min-h-0">
          <div className="shrink-0 rounded-lg border bg-muted/20 p-3">
            <p className="truncate text-xs font-medium" title={activeFixture.label}>
              {activeFixture.label}
            </p>
            <p className="mt-1 line-clamp-2 text-[0.6875rem] leading-5 text-muted-foreground">
              {activeFixture.description}
            </p>
          </div>

          <Tabs className="mt-3 flex min-h-0 flex-1 flex-col" defaultValue="metrics">
            <TabsList className="grid w-full shrink-0 grid-cols-3">
              <TabsTrigger value="metrics">
                <Activity aria-hidden className="mr-1 size-3.5" />
                指标
              </TabsTrigger>
              <TabsTrigger value="patches">
                <Braces aria-hidden className="mr-1 size-3.5" />
                Patch
              </TabsTrigger>
              <TabsTrigger value="runtime">
                <Cpu aria-hidden className="mr-1 size-3.5" />
                运行时
              </TabsTrigger>
            </TabsList>

            <TabsContent className="min-h-0 flex-1 overflow-y-auto pr-1" value="metrics">
              <MetricsPanel metrics={state.metrics} />
            </TabsContent>
            <TabsContent className="min-h-0 flex-1 overflow-y-auto" value="patches">
              <PatchLog entries={state.patchLog} />
            </TabsContent>
            <TabsContent className="min-h-0 flex-1 overflow-y-auto pr-1" value="runtime">
              <RuntimePanel instanceCount={state.instanceCount} statuses={state.runtimeStatuses} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

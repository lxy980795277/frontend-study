'use client';

import { Activity, Braces, Cpu } from 'lucide-react';
import type { FC } from 'react';

import { Badge } from '@/components/ui/badge';
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

export const MarkdownStreamRenderingLab: FC = () => {
  const lab = useMarkdownStreamLab();
  const { actions, activeFixture, state } = lab;

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-4 xl:h-full">
      <header className="shrink-0 pr-0 sm:pr-32">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">Markdown 流式增量渲染</h1>
          <Badge variant="secondary">Web Worker</Badge>
          <Badge variant="outline">Block Diff</Badge>
        </div>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
          用同一组确定性流式帧，对比主线程全量渲染与 Worker 解析、块级 Diff、最小 DOM Patch 的真实开销和降级边界。
        </p>
      </header>

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

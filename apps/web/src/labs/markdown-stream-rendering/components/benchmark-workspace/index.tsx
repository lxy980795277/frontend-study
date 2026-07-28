'use client';

import { Activity, CircleCheck, Gauge, LoaderCircle } from 'lucide-react';
import type { FC } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import type { BenchmarkActiveExecution, BenchmarkRenderer, IsolatedBenchmarkPhase } from '../../benchmark/types';
import type { IsolatedBenchmarkActions } from '../../hooks/use-isolated-benchmark';
import type { RunMetricsSnapshot } from '../../metrics/types';
import { SingleRendererHost } from '../single-renderer-host';

interface BenchmarkWorkspaceProps {
  actions: Pick<
    IsolatedBenchmarkActions,
    | 'onCoalescedFrame'
    | 'onCommit'
    | 'onIncrementalSample'
    | 'onLegacySample'
    | 'onPatch'
    | 'onRuntimeStatus'
    | 'onWorkerRequest'
  >;
  activeExecution: BenchmarkActiveExecution | null;
  completedExecutions: number;
  content: string;
  lastRenderer: BenchmarkRenderer | null;
  metrics: RunMetricsSnapshot;
  phase: IsolatedBenchmarkPhase;
  totalExecutions: number;
}

const PHASE_LABELS: Record<IsolatedBenchmarkPhase, string> = {
  completed: '基准已完成',
  error: '运行失败',
  idle: '等待开始',
  measuring: '正式测量',
  preparing: '建立渲染基线',
  settling: '释放资源并等待帧稳定',
  stopped: '任务已停止',
};
const RENDERER_LABELS: Record<BenchmarkRenderer, string> = {
  incremental: 'Incremental',
  legacy: 'Legacy',
};

export const BenchmarkWorkspace: FC<BenchmarkWorkspaceProps> = ({
  actions,
  activeExecution,
  completedExecutions,
  content,
  lastRenderer,
  metrics,
  phase,
  totalExecutions,
}) => {
  const activeRendererLabel = activeExecution ? RENDERER_LABELS[activeExecution.execution.renderer] : '';

  return (
    <section aria-label="隔离基准工作区" className="min-w-0" data-testid="isolated-benchmark-workspace">
      <div className="mb-3 flex min-h-10 flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          {isBusyPhase(phase) && <LoaderCircle aria-hidden className="size-3.5 animate-spin text-primary" />}
          {phase === 'completed' && <CircleCheck aria-hidden className="size-3.5 text-success" />}
          <span className="font-medium">{PHASE_LABELS[phase]}</span>
          {activeExecution && <Badge variant="secondary">{activeRendererLabel}</Badge>}
        </div>
        <span className="font-mono text-muted-foreground">
          {completedExecutions} / {totalExecutions || '—'} executions
        </span>
      </div>

      <div className="grid min-h-0 min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        {activeExecution && (
          <SingleRendererHost
            key={activeExecution.rendererKey}
            activeExecution={activeExecution}
            content={content}
            onCoalescedFrame={actions.onCoalescedFrame}
            onCommit={actions.onCommit}
            onIncrementalSample={actions.onIncrementalSample}
            onLegacySample={actions.onLegacySample}
            onPatch={actions.onPatch}
            onRuntimeStatus={actions.onRuntimeStatus}
            onWorkerRequest={actions.onWorkerRequest}
          />
        )}
        {!activeExecution && <WorkspacePlaceholder phase={phase} />}

        <LiveMetrics activeExecution={activeExecution} lastRenderer={lastRenderer} metrics={metrics} />
      </div>
    </section>
  );
};

interface WorkspacePlaceholderProps {
  phase: IsolatedBenchmarkPhase;
}

const WorkspacePlaceholder: FC<WorkspacePlaceholderProps> = ({ phase }) => {
  return (
    <div className="flex h-[32rem] items-center justify-center rounded-xl border border-dashed bg-muted/10">
      <div className="max-w-sm px-6 text-center">
        <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Gauge aria-hidden className="size-5" />
        </div>
        <p className="mt-3 text-sm font-semibold">{PHASE_LABELS[phase]}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          开始后只挂载当前 Renderer，执行完成会卸载并等待浏览器稳定，再进入下一项。
        </p>
      </div>
    </div>
  );
};

interface LiveMetricsProps {
  activeExecution: BenchmarkActiveExecution | null;
  lastRenderer: BenchmarkRenderer | null;
  metrics: RunMetricsSnapshot;
}

const LiveMetrics: FC<LiveMetricsProps> = ({ activeExecution, lastRenderer, metrics }) => {
  const renderer = activeExecution?.execution.renderer ?? lastRenderer;
  let mainMetrics = metrics.legacy;
  let workerRequests = 0;
  let coalescedFrames = 0;
  if (renderer === 'incremental') {
    mainMetrics = metrics.incremental;
    workerRequests = metrics.incremental.workerRequests;
    coalescedFrames = metrics.incremental.coalescedFrames;
  }
  const rendererLabel = renderer === null ? '—' : RENDERER_LABELS[renderer];

  return (
    <Card className="h-[32rem] min-w-0 overflow-y-auto p-3" data-testid="isolated-live-metrics">
      <div className="flex items-center gap-2">
        <Activity aria-hidden className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">当前执行</h2>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <LiveMetric label="Input frames" value={String(metrics.inputFrames)} />
        <LiveMetric label="DOM commits" value={String(mainMetrics.commits)} />
        <LiveMetric label="Main total" value={formatDuration(mainMetrics.mainTotalMs)} />
        <LiveMetric label="Main max" value={formatDuration(mainMetrics.mainMaxMs)} />
        <LiveMetric label="Elapsed" value={formatDuration(metrics.elapsedMs)} />
        <LiveMetric label="Worker request" value={String(workerRequests)} />
        <LiveMetric label="Coalesced" value={String(coalescedFrames)} />
        <LiveMetric label="Renderer" value={rendererLabel} />
      </dl>
      <p className="mt-4 rounded-lg border bg-muted/20 p-3 text-[0.6875rem] leading-5 text-muted-foreground">
        正式结果以最后一个输入帧已经提交到 DOM 为结束点；流发送完成但 Commit 未完成时，计时仍继续。
      </p>
    </Card>
  );
};

interface LiveMetricProps {
  label: string;
  value: string;
}

const LiveMetric: FC<LiveMetricProps> = ({ label, value }) => {
  return (
    <div className="min-w-0 rounded-lg border p-2.5">
      <dt className="truncate text-[0.625rem] text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate font-mono font-medium" title={value}>
        {value}
      </dd>
    </div>
  );
};

function isBusyPhase(phase: IsolatedBenchmarkPhase): boolean {
  return phase === 'measuring' || phase === 'preparing' || phase === 'settling';
}

function formatDuration(value: number): string {
  return `${value.toFixed(2)} ms`;
}

import { CircleCheck, LoaderCircle, RotateCcw, TriangleAlert } from 'lucide-react';
import type { FC } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

import type { MarkdownStreamBenchmarkState } from '../../hooks/use-markdown-stream-lab';

interface BaselineStatusProps {
  benchmark: MarkdownStreamBenchmarkState;
  onRetry: () => void;
}

const PHASE_LABELS: Record<MarkdownStreamBenchmarkState['phase'], string> = {
  completed: '本轮续写完成',
  error: '基准加载失败',
  loading: '正在加载超大 Markdown 基准',
  paused: '流式续写已暂停',
  preparing: '正在构建并确认 10× 渲染基线',
  ready: '超大基线已就绪',
  running: '正在推送流式续写',
};

export const BaselineStatus: FC<BaselineStatusProps> = ({ benchmark, onRetry }) => {
  const isBusy = benchmark.phase === 'loading' || benchmark.phase === 'preparing';
  const hasError = benchmark.phase === 'error';
  const isReady =
    benchmark.phase === 'ready' ||
    benchmark.phase === 'running' ||
    benchmark.phase === 'paused' ||
    benchmark.phase === 'completed';

  return (
    <section
      aria-live="polite"
      data-testid="benchmark-status"
      className={cn(
        'flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-xs',
        hasError && 'border-destructive/30 bg-destructive/5',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {isBusy && <LoaderCircle aria-hidden className="size-4 shrink-0 animate-spin text-primary" />}
        {hasError && <TriangleAlert aria-hidden className="size-4 shrink-0 text-destructive" />}
        {isReady && <CircleCheck aria-hidden className="size-4 shrink-0 text-success" />}
        <div className="min-w-0">
          <p className={cn('font-medium', hasError && 'text-destructive')}>{PHASE_LABELS[benchmark.phase]}</p>
          {hasError && <p className="mt-0.5 text-muted-foreground">{benchmark.errorMessage}</p>}
        </div>
      </div>

      {isReady && (
        <p className="font-mono text-[0.6875rem] text-muted-foreground">
          source {formatCharacters(benchmark.sourceCharacters)} · {benchmark.copyCount}× · total{' '}
          {formatCharacters(benchmark.totalCharacters)} · {benchmark.codeBlockCount} code blocks / copy
        </p>
      )}

      {hasError && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RotateCcw aria-hidden className="size-3.5" />
          重试
        </Button>
      )}
    </section>
  );
};

function formatCharacters(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: 1,
    notation: 'compact',
  }).format(value);
}

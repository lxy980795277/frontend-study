import { CircleCheck, LoaderCircle, RotateCcw, TriangleAlert } from 'lucide-react';
import type { FC } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

interface BaselineStatusProps {
  codeBlockCount: number;
  copyCount: number;
  errorMessage: string;
  sourceCharacters: number;
  status: 'error' | 'loading' | 'ready';
  totalCharacters: number;
  onRetry: () => void;
}

export const BaselineStatus: FC<BaselineStatusProps> = ({
  codeBlockCount,
  copyCount,
  errorMessage,
  onRetry,
  sourceCharacters,
  status,
  totalCharacters,
}) => {
  const statusLabel = {
    error: '基准加载失败',
    loading: '正在加载超大 Markdown 基准',
    ready: '隔离基准数据已就绪',
  }[status];

  return (
    <section
      aria-live="polite"
      data-testid="isolated-baseline-status"
      className={cn(
        'flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-xs',
        status === 'error' && 'border-destructive/30 bg-destructive/5',
      )}
    >
      <div className="flex items-center gap-2">
        {status === 'loading' && <LoaderCircle aria-hidden className="size-4 animate-spin text-primary" />}
        {status === 'ready' && <CircleCheck aria-hidden className="size-4 text-success" />}
        {status === 'error' && <TriangleAlert aria-hidden className="size-4 text-destructive" />}
        <div>
          <p className="font-medium">{statusLabel}</p>
          {status === 'error' && <p className="mt-0.5 text-muted-foreground">{errorMessage}</p>}
        </div>
      </div>

      {status === 'ready' && (
        <p className="font-mono text-[0.6875rem] text-muted-foreground">
          source {formatCharacters(sourceCharacters)} · {copyCount}× · total {formatCharacters(totalCharacters)} ·{' '}
          {codeBlockCount} code blocks / copy
        </p>
      )}

      {status === 'error' && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RotateCcw aria-hidden className="size-3.5" />
          重试
        </Button>
      )}
    </section>
  );
};

const formatCharacters = (value: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: 1,
    notation: 'compact',
  }).format(value);
};

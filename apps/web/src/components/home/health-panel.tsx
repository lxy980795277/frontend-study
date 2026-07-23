'use client';

import type { HealthResponse } from '@frontend-study/shared-types';
import { RefreshCw, ServerCrash } from 'lucide-react';
import type { FC } from 'react';
import { useEffect, useState } from 'react';

import { HealthCard } from '@/components/home/health-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getHealth } from '@/services/health.service';

type RequestState =
  | {
      status: 'loading';
    }
  | {
      data: HealthResponse;
      status: 'success';
    }
  | {
      message: string;
      status: 'error';
    };

const LoadingState: FC = () => {
  return (
    <div aria-label="正在检查系统状态" className="grid gap-3 lg:grid-cols-3">
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </div>
  );
};

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

const ErrorState: FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <Card className="border-destructive/20 bg-destructive/5 shadow-none">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <ServerCrash aria-hidden className="size-5" />
        </div>
        <div className="flex-1">
          <p className="font-medium">无法连接后端服务</p>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw aria-hidden className="size-4" />
          重试
        </Button>
      </CardContent>
    </Card>
  );
};

export const HealthPanel: FC = () => {
  const [requestState, setRequestState] = useState<RequestState>({ status: 'loading' });
  const [requestKey, setRequestKey] = useState(0);

  const retry = (): void => {
    setRequestState({ status: 'loading' });
    setRequestKey((current) => {
      return current + 1;
    });
  };

  useEffect(() => {
    const controller = new AbortController();

    const loadHealth = async (): Promise<void> => {
      try {
        const data = await getHealth(controller.signal);
        setRequestState({ data, status: 'success' });
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        let message = '请确认 NestJS 服务已经启动。';
        if (error instanceof Error && error.message) {
          message = error.message;
        }
        setRequestState({ message, status: 'error' });
      }
    };

    void loadHealth();

    return () => {
      controller.abort();
    };
  }, [requestKey]);

  if (requestState.status === 'loading') {
    return <LoadingState />;
  }

  if (requestState.status === 'error') {
    return <ErrorState message={requestState.message} onRetry={retry} />;
  }

  const { data } = requestState;

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <HealthCard description="NestJS API 已响应" latencyMs={0} name="API" status="up" />
      <HealthCard
        description="Prisma · 远程 MySQL"
        latencyMs={data.checks.mysql.latencyMs}
        name="MySQL"
        status={data.checks.mysql.status}
      />
      <HealthCard
        description="node-redis · DB 1"
        latencyMs={data.checks.redis.latencyMs}
        name="Redis"
        status={data.checks.redis.status}
      />
    </div>
  );
};

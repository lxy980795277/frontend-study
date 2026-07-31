import type { Metadata } from 'next';
import type { FC } from 'react';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AgentStreamRecoveryLab } from '@/labs/agent-stream-recovery/components';
export const metadata: Metadata = {
  description: '基于 AG-UI、Redis Stream 与 SSE 的 Agent 流式断线恢复实验',
  title: 'Agent 流式断线恢复 · Frontend Lab',
};
const LabFallback: FC = () => {
  return (
    <div className="flex flex-col gap-5 xl:h-full">
      <Skeleton className="h-24 w-full max-w-3xl" />
      <div className="grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-[calc(100dvh-12rem)] max-h-[42rem] min-h-[32rem] xl:h-full xl:max-h-none xl:min-h-0" />
        <Skeleton className="h-80 xl:h-full xl:max-h-none xl:min-h-0" />
      </div>
    </div>
  );
};
export const AgentStreamRecoveryPage = () => {
  return (
    <main className="min-h-dvh xl:h-dvh">
      <Suspense fallback={<LabFallback />}>
        <AgentStreamRecoveryLab />
      </Suspense>
    </main>
  );
};
export default AgentStreamRecoveryPage;

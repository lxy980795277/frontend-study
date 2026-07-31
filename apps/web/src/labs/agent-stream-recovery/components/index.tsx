'use client';

import type { AgentSimulationOptions } from '@frontend-study/shared-types';
import { Cable, MessageSquarePlus, RotateCcw } from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { useAgentStreamLab } from '@/labs/agent-stream-recovery/hooks/use-agent-stream-lab';
import { Chat } from './chat';
import { ThreadHistory } from './history';
import { Inspector } from './inspector';

const BUSY_PHASES = new Set(['aborting', 'connecting', 'disconnected', 'reconnect-wait', 'streaming']);

export const AgentStreamRecoveryLab: FC = () => {
  const lab = useAgentStreamLab();
  const [simulation, setSimulation] = useState<AgentSimulationOptions>({});
  const busy = BUSY_PHASES.has(lab.activeRuntime.phase);
  const loadingDetail = lab.activeDetailStatus === 'loading';
  const canDisconnect = lab.activeRuntime.phase === 'streaming';
  const canReconnect = lab.activeRuntime.phase === 'disconnected';
  const canToggleConnection = canDisconnect || canReconnect;
  const canAbort = lab.activeRuntime.phase === 'streaming' || lab.activeRuntime.phase === 'reconnect-wait';
  const canRetry = lab.activeRuntime.phase === 'failed' && lab.activeRuntime.input !== null;
  const threadLabel = lab.activeThread?.title ?? '未创建 Thread';
  let connectionAction = lab.disconnect;
  let connectionActionLabel = '模拟断线';
  if (canReconnect) {
    connectionAction = lab.reconnect;
    connectionActionLabel = '模拟重连';
  }
  return (
    <div className="flex flex-col gap-5 xl:h-full">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">Agent 流式断线恢复</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            用统一 stream 接口验证新建、续传与刷新恢复；协议事件、游标、去重统计和故障注入全部可观测。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={lab.newThread}>
            <MessageSquarePlus aria-hidden className="size-4" />
            新会话
          </Button>
          <ThreadHistory
            activeThreadId={lab.activeThread?.id ?? null}
            loading={lab.listStatus === 'loading'}
            threads={lab.threads}
            onDelete={lab.deleteThread}
            onNew={lab.newThread}
            onSelect={lab.selectThread}
          />
          <Button disabled={!canToggleConnection} onClick={connectionAction}>
            <Cable aria-hidden className="size-4" />
            {connectionActionLabel}
          </Button>
          <Button disabled={!canRetry} onClick={lab.retry}>
            <RotateCcw aria-hidden className="size-4" />
            手动重试
          </Button>
        </div>
      </section>

      {lab.pageError && (
        <div
          className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <span>{lab.pageError}</span>
          <Button size="sm" variant="outline" onClick={lab.refreshThreadList}>
            <RotateCcw aria-hidden className="size-3.5" />
            重试
          </Button>
        </div>
      )}

      <div className="grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Chat
          busy={busy}
          canAbort={canAbort}
          loading={loadingDetail}
          messages={lab.activeProjection.messages}
          phase={lab.activeRuntime.phase}
          simulation={simulation}
          threadId={lab.activeThread?.id ?? null}
          threadLabel={threadLabel}
          onAbort={lab.abortRun}
          onSend={lab.sendMessage}
        />
        <Inspector
          busy={busy}
          duplicateEvents={lab.activeProjection.duplicateEvents}
          entries={lab.activeProjection.protocolLog}
          runtime={lab.activeRuntime}
          simulation={simulation}
          threadId={lab.activeThread?.id ?? null}
          onSimulationChange={setSimulation}
        />
      </div>
    </div>
  );
};

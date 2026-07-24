'use client';

import type { AgentSimulationOptions } from '@frontend-study/shared-types';
import { Activity, Braces, Cable, MessageSquarePlus, Network, RotateCcw } from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useAgentStreamLab } from '../../hooks/use-agent-stream-lab';
import { ConnectionInspector } from '../connection-inspector';
import { EventLog } from '../event-log';
import { FaultControls } from '../fault-controls';
import { MessageList } from '../message-list';
import { PromptComposer } from '../prompt-composer';
import { ThreadHistory } from '../thread-history';

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
        <Card className="flex h-[calc(100dvh-12rem)] max-h-[42rem] min-h-[32rem] min-w-0 flex-col overflow-hidden xl:h-full xl:max-h-none xl:min-h-0">
          <header className="flex shrink-0 items-center justify-between gap-4 border-b px-5 py-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{threadLabel}</p>
              <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                {lab.activeThread?.id ?? '首条消息发送后创建'}
              </p>
            </div>
            <Badge data-testid="run-phase" variant="secondary">
              {lab.activeRuntime.phase}
            </Badge>
          </header>
          <MessageList
            key={lab.activeThread?.id ?? 'new-thread'}
            loading={loadingDetail}
            messages={lab.activeProjection.messages}
          />
          <PromptComposer
            busy={busy}
            canAbort={canAbort}
            onAbort={() => {
              void lab.abortRun();
            }}
            onSend={(prompt) => {
              return lab.sendMessage(prompt, simulation);
            }}
          />
        </Card>

        <Card
          className="min-w-0 p-4 xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:overflow-hidden"
          data-testid="inspector-card"
        >
          <Tabs className="flex min-h-0 flex-1 flex-col" defaultValue="connection">
            <TabsList className="grid w-full shrink-0 grid-cols-3">
              <TabsTrigger value="connection">
                <Activity aria-hidden className="mr-1 size-3.5" />
                连接
              </TabsTrigger>
              <TabsTrigger value="events">
                <Braces aria-hidden className="mr-1 size-3.5" />
                事件
              </TabsTrigger>
              <TabsTrigger value="faults">
                <Network aria-hidden className="mr-1 size-3.5" />
                故障
              </TabsTrigger>
            </TabsList>
            <TabsContent value="connection">
              <ConnectionInspector
                duplicateEvents={lab.activeProjection.duplicateEvents}
                runtime={lab.activeRuntime}
                threadId={lab.activeThread?.id ?? null}
              />
            </TabsContent>
            <TabsContent className="min-h-0 flex-1" value="events">
              <EventLog entries={lab.activeProjection.protocolLog} />
            </TabsContent>
            <TabsContent value="faults">
              <FaultControls busy={busy} simulation={simulation} onSimulationChange={setSimulation} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

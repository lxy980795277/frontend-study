'use client';

import type { AgentSimulationOptions } from '@frontend-study/shared-types';
import type { FC } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import type { ChatMessageView } from '@/labs/agent-stream-recovery/types/conversation';
import type { ConnectionPhase } from '@/labs/agent-stream-recovery/types/runtime';
import { PromptComposer } from './composer';
import { MessageList } from './messages';

interface ChatProps {
  busy: boolean;
  canAbort: boolean;
  loading: boolean;
  messages: ChatMessageView[];
  phase: ConnectionPhase;
  simulation: AgentSimulationOptions;
  threadId: string | null;
  threadLabel: string;
  onAbort: () => Promise<void>;
  onSend: (prompt: string, simulation: AgentSimulationOptions) => Promise<void>;
}

export const Chat: FC<ChatProps> = ({
  busy,
  canAbort,
  loading,
  messages,
  onAbort,
  onSend,
  phase,
  simulation,
  threadId,
  threadLabel,
}) => {
  return (
    <Card className="flex h-[calc(100dvh-12rem)] max-h-[42rem] min-h-[32rem] min-w-0 flex-col overflow-hidden xl:h-full xl:max-h-none xl:min-h-0">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b px-5 py-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{threadLabel}</p>
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{threadId ?? '首条消息发送后创建'}</p>
        </div>
        <Badge data-testid="run-phase" variant="secondary">
          {phase}
        </Badge>
      </header>
      <MessageList key={threadId ?? 'new-thread'} loading={loading} messages={messages} />
      <PromptComposer
        busy={busy}
        canAbort={canAbort}
        onAbort={() => {
          return onAbort();
        }}
        onSend={(prompt) => {
          return onSend(prompt, simulation);
        }}
      />
    </Card>
  );
};

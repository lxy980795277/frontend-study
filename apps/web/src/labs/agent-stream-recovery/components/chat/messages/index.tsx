'use client';
import { CheckCircle2, CircleStop, LoaderCircle, Wrench } from 'lucide-react';
import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import { MarkdownRenderer } from '@/components/markdown/markdown-renderer';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/utils/cn';
import type { ChatMessageView } from '@/labs/agent-stream-recovery/types/conversation';
interface MessageListProps {
  loading: boolean;
  messages: ChatMessageView[];
}
const getMessageAlignment = (role: ChatMessageView['role']): string => {
  if (role === 'user') {
    return 'items-end';
  }
  return 'items-start';
};
const getMessageStyle = (role: ChatMessageView['role']): string => {
  if (role === 'user') {
    return 'max-w-[85%] rounded-[4px] bg-primary px-3 py-2 whitespace-pre-wrap text-primary-foreground';
  }
  return 'w-full max-w-[92%] rounded-xl bg-card px-4 py-3 text-card-foreground';
};
export const MessageList: FC<MessageListProps> = ({ loading, messages }) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const pinnedToBottomRef = useRef(true);
  const visibleMessages = messages.filter((message) => {
    return message.role !== 'tool';
  });
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const updatePinnedState = (): void => {
      const distanceToBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      pinnedToBottomRef.current = distanceToBottom <= 80;
    };
    viewport.addEventListener('scroll', updatePinnedState, { passive: true });
    return () => {
      viewport.removeEventListener('scroll', updatePinnedState);
    };
  }, []);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !pinnedToBottomRef.current) {
      return;
    }
    const frameId = requestAnimationFrame(() => {
      viewport.scrollTop = viewport.scrollHeight;
    });
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [loading, messages]);
  return (
    <ScrollArea className="min-h-0 flex-1" data-testid="message-scroll-area" viewportRef={viewportRef}>
      <div className="space-y-5 p-5 text-xs lg:p-6" data-testid="message-list">
        {loading && (
          <div className="flex min-h-72 items-center justify-center text-xs text-muted-foreground">
            <LoaderCircle aria-hidden className="mr-2 size-4 animate-spin" />
            正在恢复 Thread 历史…
          </div>
        )}

        {!loading &&
          visibleMessages.map((message) => {
            return (
              <article
                key={message.id}
                className={cn('flex flex-col gap-1.5', getMessageAlignment(message.role))}
                data-message-role={message.role}
              >
                {message.status === 'streaming' && (
                  <span className="inline-flex items-center gap-1 px-1 text-muted-foreground">
                    <LoaderCircle aria-hidden className="size-3 animate-spin" />
                    streaming
                  </span>
                )}
                {message.status === 'interrupted' && (
                  <span className="inline-flex items-center gap-1 px-1 text-warning">
                    <CircleStop aria-hidden className="size-3" />
                    interrupted
                  </span>
                )}
                <div className={cn('text-xs leading-6', getMessageStyle(message.role))} data-message-id={message.id}>
                  {message.role === 'assistant' && (
                    <MarkdownRenderer
                      className="text-xs [&_code]:text-xs [&_h1]:text-xs [&_h2]:text-xs [&_h3]:text-xs [&_table]:text-xs"
                      content={message.content}
                    />
                  )}
                  {message.role !== 'assistant' && message.content}
                  {message.toolCalls.length > 0 && (
                    <div className="mt-4 space-y-2 border-t border-current/15 pt-3">
                      {message.toolCalls.map((toolCall) => {
                        return (
                          <div key={toolCall.id} className="rounded-lg border bg-background/70 p-3 text-foreground">
                            <div className="flex flex-wrap items-center gap-2">
                              <Wrench aria-hidden className="size-3.5" />
                              <span className="font-mono text-xs font-medium">{toolCall.name}</span>
                              <Badge variant="secondary">{toolCall.status}</Badge>
                            </div>
                            <pre className="mt-2 overflow-x-auto text-xs leading-5 whitespace-pre-wrap text-muted-foreground">
                              {toolCall.argumentsText}
                            </pre>
                            {toolCall.result && (
                              <div className="mt-2 flex gap-2 border-t pt-2 text-xs">
                                <CheckCircle2 aria-hidden className="mt-0.5 size-3.5 shrink-0 text-success" />
                                <code className="break-all">{toolCall.result}</code>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
      </div>
    </ScrollArea>
  );
};

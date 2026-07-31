'use client';
import type { ThreadSummary } from '@frontend-study/shared-types';
import { History, LoaderCircle, MessageSquare, Plus, Trash2 } from 'lucide-react';
import type { FC } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/utils/cn';

interface ThreadHistoryProps {
  activeThreadId: string | null;
  loading: boolean;
  threads: ThreadSummary[];
  onDelete: (threadId: string) => Promise<void>;
  onNew: () => void;
  onSelect: (threadId: string) => void;
}
const formatThreadDate = (value: string): string => {
  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
};
export const ThreadHistory: FC<ThreadHistoryProps> = ({
  activeThreadId,
  loading,
  threads,
  onDelete,
  onNew,
  onSelect,
}) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <History aria-hidden className="size-4" />
          会话历史
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Thread 历史</SheetTitle>
          <SheetDescription>历史来自 MySQL；刷新后不依赖浏览器本地业务状态。</SheetDescription>
        </SheetHeader>
        <div className="p-4">
          <SheetClose asChild>
            <Button className="w-full" onClick={onNew}>
              <Plus aria-hidden className="size-4" />
              新建会话
            </Button>
          </SheetClose>
        </div>
        <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
          {loading && (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <LoaderCircle aria-hidden className="mr-2 size-4 animate-spin" />
              加载会话…
            </div>
          )}
          {!loading && threads.length === 0 && (
            <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
              暂无历史会话
            </div>
          )}
          <div className="space-y-2">
            {threads.map((thread) => {
              const active = thread.id === activeThreadId;
              return (
                <div
                  key={thread.id}
                  className={cn(
                    'group rounded-lg border p-3 transition-colors',
                    active && 'border-primary bg-accent/50',
                  )}
                >
                  <div className="flex items-start gap-2">
                    <SheetClose asChild>
                      <button
                        className="min-w-0 flex-1 text-left outline-none"
                        type="button"
                        onClick={() => {
                          onSelect(thread.id);
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <MessageSquare aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate text-sm font-medium">{thread.title ?? '新会话'}</span>
                        </span>
                        <span className="mt-1.5 block font-mono text-[0.6875rem] text-muted-foreground">
                          {thread.id.slice(0, 13)}…
                        </span>
                      </button>
                    </SheetClose>
                    <Button
                      aria-label="删除会话"
                      className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        void onDelete(thread.id);
                      }}
                    >
                      <Trash2 aria-hidden className="size-3.5" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[0.6875rem] text-muted-foreground">{formatThreadDate(thread.updatedAt)}</span>
                    {thread.activeRun && <Badge variant="secondary">{thread.activeRun.status}</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

'use client';
import { ArrowUp, LoaderCircle, Square } from 'lucide-react';
import type { FormEvent, FC, KeyboardEvent } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface PromptComposerProps {
  busy: boolean;
  canAbort: boolean;
  onAbort: () => void;
  onSend: (prompt: string) => Promise<void>;
}
export const PromptComposer: FC<PromptComposerProps> = ({ busy, canAbort, onAbort, onSend }) => {
  const [prompt, setPrompt] = useState('');
  const submit = async (): Promise<void> => {
    const content = prompt.trim();
    if (!content || busy) {
      return;
    }
    setPrompt('');
    await onSend(content);
  };
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void submit();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  };
  return (
    <form className="shrink-0 bg-card/70 px-4 py-4 sm:px-6" onSubmit={handleSubmit}>
      <div className="relative mx-auto w-full max-w-3xl">
        <Textarea
          aria-label="输入消息"
          className="max-h-44 min-h-28 resize-none rounded-xl bg-background pt-4 pr-14 pb-10 pl-5 text-xs shadow-sm"
          disabled={busy}
          maxLength={4000}
          placeholder="输入消息。Enter 发送，Shift + Enter 换行。"
          value={prompt}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            setPrompt(event.target.value);
          }}
        />
        <p className="pointer-events-none absolute bottom-3 left-5 text-xs text-muted-foreground">
          {prompt.length} / 4000
        </p>
        {!busy && (
          <Button
            aria-label="发送消息"
            className="absolute right-3 bottom-2.5 size-8 rounded-full"
            disabled={!prompt.trim()}
            size="icon"
            type="submit"
          >
            <ArrowUp aria-hidden className="size-4" />
          </Button>
        )}
        {busy && canAbort && (
          <Button
            aria-label="停止运行"
            className="absolute right-3 bottom-2.5 size-8 rounded-full"
            size="icon"
            type="button"
            variant="outline"
            onClick={onAbort}
          >
            <Square aria-hidden className="size-3.5 fill-current" />
          </Button>
        )}
        {busy && !canAbort && (
          <Button
            disabled
            aria-label="正在建立运行"
            className="absolute right-3 bottom-2.5 size-8 rounded-full"
            size="icon"
            type="button"
            variant="outline"
          >
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          </Button>
        )}
      </div>
    </form>
  );
};

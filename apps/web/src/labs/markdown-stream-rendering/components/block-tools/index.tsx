'use client';

import { Check, ChevronDown, ChevronRight, Copy, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState, type FC } from 'react';

import { Button } from '@/components/ui/button';

import type { BlockKind } from '../../core/diff/blocks';

interface BlockToolsProps {
  block: HTMLElement;
  kind: BlockKind;
}

type CopyStatus = 'copied' | 'error' | 'idle';

export const BlockTools: FC<BlockToolsProps> = ({ block, kind }) => {
  const blockElement = useRef(block);
  const [collapsed, setCollapsed] = useState(block.dataset.collapsed === 'true');
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current);
      }
    };
  }, []);

  const handleCopy = async (): Promise<void> => {
    try {
      const content = kind === 'table' ? readTableAsTsv(block) : readCode(block);
      await navigator.clipboard.writeText(content);
      setTemporaryCopyStatus('copied');
    } catch {
      setTemporaryCopyStatus('error');
    }
  };

  const setTemporaryCopyStatus = (status: CopyStatus): void => {
    setCopyStatus(status);

    if (resetTimer.current !== null) {
      window.clearTimeout(resetTimer.current);
    }
    resetTimer.current = window.setTimeout(() => {
      setCopyStatus('idle');
    }, 1_500);
  };

  const handleToggle = (): void => {
    const nextCollapsed = !collapsed;
    blockElement.current.dataset.collapsed = String(nextCollapsed);
    setCollapsed(nextCollapsed);
  };

  return (
    <div className="flex items-center gap-1 rounded-md border bg-background/90 p-0.5 shadow-sm backdrop-blur">
      {kind === 'code' && (
        <Button
          aria-label={collapsed ? '展开代码块' : '折叠代码块'}
          className="size-6"
          size="icon"
          variant="ghost"
          onClick={handleToggle}
        >
          {collapsed && <ChevronRight aria-hidden className="size-3.5" />}
          {!collapsed && <ChevronDown aria-hidden className="size-3.5" />}
        </Button>
      )}
      <Button
        aria-label={kind === 'table' ? '复制表格为 TSV' : '复制代码'}
        className="size-6"
        size="icon"
        variant="ghost"
        onClick={handleCopy}
      >
        {copyStatus === 'idle' && <Copy aria-hidden className="size-3.5" />}
        {copyStatus === 'copied' && <Check aria-hidden className="size-3.5 text-success" />}
        {copyStatus === 'error' && <TriangleAlert aria-hidden className="size-3.5 text-destructive" />}
      </Button>
    </div>
  );
};

function readCode(block: HTMLElement): string {
  return block.querySelector('.msr-content code')?.textContent ?? '';
}

function readTableAsTsv(block: HTMLElement): string {
  const rows = Array.from(block.querySelectorAll('.msr-content tr'));

  return rows
    .map((row) => {
      return Array.from(row.querySelectorAll('th, td'))
        .map((cell) => cell.textContent ?? '')
        .join('\t');
    })
    .join('\n');
}

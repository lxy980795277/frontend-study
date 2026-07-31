import { commonPrefixLength, diffBlocks } from '../diff/diff';
import { toBlockSnapshot } from '../diff/blocks';
import type { MarkdownBlock, MarkdownPatch, TailTarget } from '@/labs/markdown-stream-rendering/types/markdown';
export const generatePatches = (previous: MarkdownBlock[], next: MarkdownBlock[]): MarkdownPatch[] => {
  const diff = diffBlocks(previous, next);
  if (diff.deleteCount === 0 && diff.insertCount === 0) {
    return [];
  }
  const isLastBlockOnly =
    diff.deleteCount === 1 &&
    diff.insertCount === 1 &&
    previous.length === next.length &&
    diff.start === next.length - 1;
  if (isLastBlockOnly) {
    const previousBlock = previous[diff.start];
    const nextBlock = next[diff.start];
    if (previousBlock && nextBlock) {
      return [createTailPatch(previousBlock, nextBlock, diff.start)];
    }
  }
  return [
    {
      deleteCount: diff.deleteCount,
      insertBlocks: next.slice(diff.start, diff.start + diff.insertCount).map(toBlockSnapshot),
      op: 'replaceRange',
      start: diff.start,
    },
  ];
};
const createTailPatch = (previous: MarkdownBlock, next: MarkdownBlock, blockIndex: number): MarkdownPatch => {
  const append = extractPlainAppend(previous, next);
  if (append !== null && previous.blockId === next.blockId) {
    return {
      blockId: previous.blockId,
      blockIndex,
      expectedSignature: previous.signature,
      fallbackBlock: toBlockSnapshot(next),
      nextSignature: next.signature,
      op: 'tailAppendText',
      target: getTailTarget(next),
      text: append,
    };
  }
  return {
    block: toBlockSnapshot(next),
    blockIndex,
    expectedBlockId: previous.blockId,
    op: 'tailAppendFallbackHtml',
  };
};
const extractPlainAppend = (previous: MarkdownBlock, next: MarkdownBlock): string | null => {
  if (
    previous.kind !== next.kind ||
    !next.source.startsWith(previous.source) ||
    next.source.length <= previous.source.length
  ) {
    return null;
  }
  const appendedSource = next.source.slice(previous.source.length);
  const prefixLength = commonPrefixLength(previous.html, next.html);
  const previousRest = previous.html.slice(prefixLength);
  const nextRest = next.html.slice(prefixLength);
  if (!nextRest.endsWith(previousRest)) {
    return null;
  }
  const insertedHtml = nextRest.slice(0, nextRest.length - previousRest.length);
  if (insertedHtml !== escapeText(appendedSource)) {
    return null;
  }
  return appendedSource;
};
const escapeText = (value: string): string => {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
};
const getTailTarget = (block: MarkdownBlock): TailTarget => {
  if (block.kind === 'code') {
    return 'code';
  }
  return 'block-root';
};

import type { BlockDiff, MarkdownBlock } from '../../types/markdown';

export const diffBlocks = (previous: MarkdownBlock[], next: MarkdownBlock[]): BlockDiff => {
  const sharedLength = Math.min(previous.length, next.length);
  let prefix = 0;
  while (prefix < sharedLength) {
    const previousBlock = previous[prefix]!;
    const nextBlock = next[prefix]!;
    if (previousBlock.signature !== nextBlock.signature) {
      break;
    }
    prefix += 1;
  }
  let suffix = 0;
  while (suffix < sharedLength - prefix) {
    const previousBlock = previous[previous.length - 1 - suffix]!;
    const nextBlock = next[next.length - 1 - suffix]!;
    if (previousBlock.signature !== nextBlock.signature) {
      break;
    }
    suffix += 1;
  }
  return {
    deleteCount: previous.length - prefix - suffix,
    insertCount: next.length - prefix - suffix,
    start: prefix,
  };
};
export const commonPrefixLength = (previous: string, next: string): number => {
  const length = Math.min(previous.length, next.length);
  let index = 0;
  while (index < length && previous.charCodeAt(index) === next.charCodeAt(index)) {
    index += 1;
  }
  return index;
};

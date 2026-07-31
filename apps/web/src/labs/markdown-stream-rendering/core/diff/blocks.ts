import type { BlockSnapshot, MarkdownBlock, ParsedBlock } from '../../types/markdown';

export const toBlockSnapshot = (block: MarkdownBlock): BlockSnapshot => {
  return {
    blockId: block.blockId,
    html: block.html,
    kind: block.kind,
    needsTools: block.needsTools,
    signature: block.signature,
  };
};
export const assignBlockIds = (
  previous: MarkdownBlock[],
  parsed: ParsedBlock[],
  createId: () => string,
): MarkdownBlock[] => {
  const next = parsed.map((block) => {
    return { ...block, blockId: createId() };
  });
  const sharedLength = Math.min(previous.length, next.length);

  // 稳定复用首尾未变 Block 的 id，保证主线程上的工具挂载和折叠状态不会抖动。
  let prefix = 0;
  while (prefix < sharedLength) {
    const previousBlock = previous[prefix]!;
    const nextBlock = next[prefix]!;
    if (previousBlock.signature !== nextBlock.signature) {
      break;
    }
    nextBlock.blockId = previousBlock.blockId;
    prefix += 1;
  }
  let suffix = 0;
  while (suffix < sharedLength - prefix) {
    const previousBlock = previous[previous.length - 1 - suffix]!;
    const nextBlock = next[next.length - 1 - suffix]!;
    if (previousBlock.signature !== nextBlock.signature) {
      break;
    }
    nextBlock.blockId = previousBlock.blockId;
    suffix += 1;
  }
  const isSingleTailChange =
    previous.length === next.length && next.length > 0 && prefix === next.length - 1 && suffix === 0;
  if (isSingleTailChange) {
    const previousTail = previous[prefix]!;
    const nextTail = next[prefix]!;
    if (previousTail.kind === nextTail.kind && nextTail.source.startsWith(previousTail.source)) {
      nextTail.blockId = previousTail.blockId;
    }
  }
  return next;
};

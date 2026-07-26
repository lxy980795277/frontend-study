export type BlockKind = 'code' | 'heading' | 'html' | 'hr' | 'list' | 'paragraph' | 'quote' | 'table';

export interface ParsedBlock {
  html: string;
  kind: BlockKind;
  needsTools: boolean;
  signature: number;
  source: string;
}

export interface MarkdownBlock extends ParsedBlock {
  blockId: string;
}

export interface BlockSnapshot {
  blockId: string;
  html: string;
  kind: BlockKind;
  needsTools: boolean;
  signature: number;
}

export function toBlockSnapshot(block: MarkdownBlock): BlockSnapshot {
  return {
    blockId: block.blockId,
    html: block.html,
    kind: block.kind,
    needsTools: block.needsTools,
    signature: block.signature,
  };
}

export function assignBlockIds(
  previous: MarkdownBlock[],
  parsed: ParsedBlock[],
  createId: () => string,
): MarkdownBlock[] {
  const next = parsed.map((block) => ({ ...block, blockId: createId() }));
  const sharedLength = Math.min(previous.length, next.length);

  let prefix = 0;
  while (prefix < sharedLength) {
    const previousBlock = previous[prefix];
    const nextBlock = next[prefix];
    if (!previousBlock || !nextBlock || previousBlock.signature !== nextBlock.signature) {
      break;
    }

    nextBlock.blockId = previousBlock.blockId;
    prefix += 1;
  }

  let suffix = 0;
  while (suffix < sharedLength - prefix) {
    const previousBlock = previous[previous.length - 1 - suffix];
    const nextBlock = next[next.length - 1 - suffix];
    if (!previousBlock || !nextBlock || previousBlock.signature !== nextBlock.signature) {
      break;
    }

    nextBlock.blockId = previousBlock.blockId;
    suffix += 1;
  }

  const previousTail = previous[prefix];
  const nextTail = next[prefix];
  const isSingleTailChange =
    previous.length === next.length &&
    next.length > 0 &&
    prefix === next.length - 1 &&
    suffix === 0 &&
    previousTail !== undefined &&
    nextTail !== undefined &&
    previousTail.kind === nextTail.kind &&
    nextTail.source.startsWith(previousTail.source);

  if (isSingleTailChange && previousTail && nextTail) {
    nextTail.blockId = previousTail.blockId;
  }

  return next;
}

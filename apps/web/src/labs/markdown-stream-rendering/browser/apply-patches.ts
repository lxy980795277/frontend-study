import type { BlockSnapshot } from '../core/diff/blocks';
import type { MarkdownPatch, PatchResult, TailAppendTextPatch } from '../core/patch/types';

const BLOCK_SELECTOR = ':scope > .msr-block';

export class RevisionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RevisionConflictError';
  }
}

export interface ApplyPatchResult {
  changedBlocks: HTMLElement[];
  removedBlocks: HTMLElement[];
  usedSnapshotFallback: boolean;
}

export function applyPatchResult(
  container: HTMLElement,
  result: PatchResult,
  sanitize: (html: string) => string,
): ApplyPatchResult {
  const currentRevision = getContainerRevision(container);

  if (currentRevision === result.nextRevision) {
    return {
      changedBlocks: [],
      removedBlocks: [],
      usedSnapshotFallback: false,
    };
  }

  if (currentRevision !== result.baseRevision) {
    throw new RevisionConflictError(`Expected revision ${result.baseRevision}, received ${currentRevision}`);
  }

  const aggregate: ApplyPatchResult = {
    changedBlocks: [],
    removedBlocks: [],
    usedSnapshotFallback: false,
  };

  result.patches.forEach((patch) => {
    applyPatch(container, patch, sanitize, aggregate);
  });
  container.dataset.revision = String(result.nextRevision);

  return aggregate;
}

export function replaceWithFullSnapshot(
  container: HTMLElement,
  html: string,
  sanitize: (value: string) => string,
): HTMLElement[] {
  const removedBlocks = Array.from(container.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
  container.replaceChildren();
  container.dataset.revision = '0';

  const content = document.createElement('div');
  content.className = 'msr-fallback-content';
  content.innerHTML = sanitize(html);
  container.append(content);
  return removedBlocks;
}

function applyPatch(
  container: HTMLElement,
  patch: MarkdownPatch,
  sanitize: (html: string) => string,
  aggregate: ApplyPatchResult,
): void {
  if (patch.op === 'replaceRange') {
    applyReplaceRange(container, patch, sanitize, aggregate);
    return;
  }

  if (patch.op === 'tailAppendFallbackHtml') {
    const previous = getBlock(container, patch.blockIndex);
    if (!previous || previous.dataset.blockId !== patch.expectedBlockId) {
      throw new RevisionConflictError(`Missing block ${patch.expectedBlockId}`);
    }

    const replacement = createBlockElement(patch.block, sanitize);
    preserveBlockState(previous, replacement);
    previous.replaceWith(replacement);
    aggregate.removedBlocks.push(previous);
    aggregate.changedBlocks.push(replacement);
    aggregate.usedSnapshotFallback = true;
    return;
  }

  applyTailAppend(container, patch, sanitize, aggregate);
}

function applyReplaceRange(
  container: HTMLElement,
  patch: Extract<MarkdownPatch, { op: 'replaceRange' }>,
  sanitize: (html: string) => string,
  aggregate: ApplyPatchResult,
): void {
  for (let index = 0; index < patch.deleteCount; index += 1) {
    const child = getBlock(container, patch.start);
    if (!child) {
      break;
    }

    aggregate.removedBlocks.push(child);
    child.remove();
  }

  const anchor = getBlock(container, patch.start);
  patch.insertBlocks.forEach((block) => {
    const element = createBlockElement(block, sanitize);
    container.insertBefore(element, anchor);
    aggregate.changedBlocks.push(element);
  });
}

function applyTailAppend(
  container: HTMLElement,
  patch: TailAppendTextPatch,
  sanitize: (html: string) => string,
  aggregate: ApplyPatchResult,
): void {
  const block = getBlock(container, patch.blockIndex);

  if (
    !block ||
    block.dataset.blockId !== patch.blockId ||
    Number(block.dataset.signature) !== patch.expectedSignature
  ) {
    throw new RevisionConflictError(`Tail block ${patch.blockId} does not match the expected signature`);
  }

  const content = block.querySelector<HTMLElement>(':scope > .msr-content');
  let target: HTMLElement | null = null;
  if (patch.target === 'code') {
    target = content?.querySelector<HTMLElement>('pre > code') ?? null;
  } else if (content?.firstElementChild instanceof HTMLElement) {
    target = content.firstElementChild;
  }

  if (!content || !target) {
    replaceTailWithSnapshot(block, patch.fallbackBlock, sanitize, aggregate);
    return;
  }

  target.append(document.createTextNode(patch.text));

  if (!matchesSnapshot(content, patch.fallbackBlock.html, sanitize)) {
    replaceTailWithSnapshot(block, patch.fallbackBlock, sanitize, aggregate);
    return;
  }

  block.dataset.signature = String(patch.nextSignature);
  aggregate.changedBlocks.push(block);
}

function replaceTailWithSnapshot(
  previous: HTMLElement,
  snapshot: BlockSnapshot,
  sanitize: (html: string) => string,
  aggregate: ApplyPatchResult,
): void {
  const replacement = createBlockElement(snapshot, sanitize);
  preserveBlockState(previous, replacement);
  previous.replaceWith(replacement);
  aggregate.removedBlocks.push(previous);
  aggregate.changedBlocks.push(replacement);
  aggregate.usedSnapshotFallback = true;
}

function createBlockElement(block: BlockSnapshot, sanitize: (html: string) => string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'msr-block';
  wrapper.dataset.blockId = block.blockId;
  wrapper.dataset.kind = block.kind;
  wrapper.dataset.needsTools = String(block.needsTools);
  wrapper.dataset.signature = String(block.signature);

  const content = document.createElement('div');
  content.className = 'msr-content';
  content.innerHTML = sanitize(block.html);
  wrapper.append(content);

  const tools = document.createElement('div');
  tools.className = 'msr-tools';
  wrapper.append(tools);

  return wrapper;
}

function getContainerRevision(container: HTMLElement): number {
  const revision = Number(container.dataset.revision ?? '0');
  return Number.isFinite(revision) ? revision : 0;
}

function getBlock(container: HTMLElement, index: number): HTMLElement | null {
  return container.querySelectorAll<HTMLElement>(BLOCK_SELECTOR).item(index);
}

function matchesSnapshot(content: HTMLElement, html: string, sanitize: (value: string) => string): boolean {
  const expected = document.createElement('div');
  expected.innerHTML = sanitize(html);
  return content.innerHTML === expected.innerHTML;
}

function preserveBlockState(previous: HTMLElement, replacement: HTMLElement): void {
  if (previous.dataset.blockId === replacement.dataset.blockId && previous.dataset.collapsed === 'true') {
    replacement.dataset.collapsed = 'true';
  }
}

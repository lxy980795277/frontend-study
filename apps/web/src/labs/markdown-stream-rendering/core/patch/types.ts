import type { BlockSnapshot } from '../diff/blocks';

export type TailTarget = 'block-root' | 'code';

export interface ReplaceRangePatch {
  deleteCount: number;
  insertBlocks: BlockSnapshot[];
  op: 'replaceRange';
  start: number;
}

export interface TailAppendTextPatch {
  blockId: string;
  blockIndex: number;
  expectedSignature: number;
  fallbackBlock: BlockSnapshot;
  nextSignature: number;
  op: 'tailAppendText';
  target: TailTarget;
  text: string;
}

export interface TailAppendFallbackHtmlPatch {
  block: BlockSnapshot;
  blockIndex: number;
  expectedBlockId: string;
  op: 'tailAppendFallbackHtml';
}

export type MarkdownPatch = ReplaceRangePatch | TailAppendFallbackHtmlPatch | TailAppendTextPatch;

export interface WorkerMetrics {
  diffMs: number;
  parseMs: number;
}

export interface PatchResult {
  baseRevision: number;
  metrics: WorkerMetrics;
  nextRevision: number;
  patches: MarkdownPatch[];
  rendererId: string;
  reqId: number;
}

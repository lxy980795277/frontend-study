import type MarkdownIt from 'markdown-it';

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

export interface BlockDiff {
  deleteCount: number;
  insertCount: number;
  start: number;
}

export type MarkdownToken = ReturnType<MarkdownIt['parse']>[number];

export interface TokenGroup {
  endLine: number;
  kind: BlockKind;
  startLine: number;
  tokens: MarkdownToken[];
}

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

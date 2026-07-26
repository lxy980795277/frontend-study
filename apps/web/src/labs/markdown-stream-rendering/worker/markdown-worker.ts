/// <reference lib="webworker" />

import { assignBlockIds, type MarkdownBlock } from '../core/diff/blocks';
import { generatePatches } from '../core/patch/generate';
import type { PatchResult } from '../core/patch/types';
import { parseMarkdownBlocks } from './markdown-parser';
import type { MarkdownWorkerRequest, MarkdownWorkerResponse } from './protocol';

interface WorkerBaseline {
  blocks: MarkdownBlock[];
  nextBlockSequence: number;
  pending: {
    blocks: MarkdownBlock[];
    revision: number;
  } | null;
  revision: number;
}

const baselines = new Map<string, WorkerBaseline>();

self.onmessage = (event: MessageEvent<MarkdownWorkerRequest>) => {
  const request = event.data;

  if (request.type === 'reset') {
    baselines.delete(request.rendererId);
    return;
  }

  if (request.type === 'simulate-crash') {
    throw new Error(`Simulated Markdown Worker failure for ${request.rendererId}`);
  }

  if (request.type === 'commit') {
    commitPendingBaseline(request.rendererId, request.revision);
    return;
  }

  handleUpdate(request);
};

function handleUpdate(request: Extract<MarkdownWorkerRequest, { type: 'update' }>): void {
  const baseline = getBaseline(request.rendererId);

  if (baseline.revision !== request.baseRevision || baseline.pending !== null) {
    postProtocolError(request, `baseline:${baseline.revision},pending:${baseline.pending?.revision ?? 'none'}`);
    return;
  }

  const parseStartedAt = performance.now();
  const parsed = parseMarkdownBlocks(request.content);
  const parseMs = performance.now() - parseStartedAt;
  const blocks = assignBlockIds(baseline.blocks, parsed, () => {
    baseline.nextBlockSequence += 1;
    return `${request.rendererId}:block-${baseline.nextBlockSequence}`;
  });

  const diffStartedAt = performance.now();
  const patches = generatePatches(baseline.blocks, blocks);
  const diffMs = performance.now() - diffStartedAt;

  baseline.pending = {
    blocks,
    revision: request.nextRevision,
  };

  const payload: PatchResult = {
    baseRevision: request.baseRevision,
    metrics: {
      diffMs,
      parseMs,
    },
    nextRevision: request.nextRevision,
    patches,
    rendererId: request.rendererId,
    reqId: request.reqId,
  };

  const response: MarkdownWorkerResponse = {
    payload,
    type: 'patch',
  };
  self.postMessage(response);
}

function getBaseline(rendererId: string): WorkerBaseline {
  const existing = baselines.get(rendererId);
  if (existing) {
    return existing;
  }

  const baseline: WorkerBaseline = {
    blocks: [],
    nextBlockSequence: 0,
    pending: null,
    revision: 0,
  };
  baselines.set(rendererId, baseline);
  return baseline;
}

function commitPendingBaseline(rendererId: string, revision: number): void {
  const baseline = baselines.get(rendererId);

  if (!baseline?.pending || baseline.pending.revision !== revision) {
    return;
  }

  baseline.blocks = baseline.pending.blocks;
  baseline.revision = revision;
  baseline.pending = null;
}

function postProtocolError(request: Extract<MarkdownWorkerRequest, { type: 'update' }>, reason: string): void {
  const response: MarkdownWorkerResponse = {
    reason,
    rendererId: request.rendererId,
    reqId: request.reqId,
    type: 'protocol-error',
  };
  self.postMessage(response);
}

export {};

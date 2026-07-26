import type { PatchResult } from '../core/patch/types';

export type MarkdownWorkerRequest =
  | {
      baseRevision: number;
      content: string;
      nextRevision: number;
      rendererId: string;
      reqId: number;
      type: 'update';
    }
  | {
      rendererId: string;
      revision: number;
      type: 'commit';
    }
  | {
      rendererId: string;
      type: 'reset';
    }
  | {
      rendererId: string;
      type: 'simulate-crash';
    };

export type MarkdownWorkerResponse =
  | {
      payload: PatchResult;
      type: 'patch';
    }
  | {
      reason: string;
      rendererId: string;
      reqId: number;
      type: 'protocol-error';
    };

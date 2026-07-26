import { applyPatchResult, RevisionConflictError } from '../apply-patches';
import type { PatchResult } from '../../core/patch/types';

const passthrough = (html: string): string => html;

const initialResult: PatchResult = {
  baseRevision: 0,
  metrics: { diffMs: 0, parseMs: 0 },
  nextRevision: 1,
  patches: [
    {
      deleteCount: 0,
      insertBlocks: [
        {
          blockId: 'renderer:block-1',
          html: '<p><strong>bold</strong></p>',
          kind: 'paragraph',
          needsTools: false,
          signature: 1,
        },
      ],
      op: 'replaceRange',
      start: 0,
    },
  ],
  rendererId: 'renderer',
  reqId: 1,
};

describe('applyPatchResult', () => {
  it('keeps Markdown content separate from React tools during tail append', () => {
    const container = document.createElement('div');
    applyPatchResult(container, initialResult, passthrough);
    const tools = container.querySelector('.msr-tools');
    tools?.append(document.createElement('button'));

    applyPatchResult(
      container,
      {
        baseRevision: 1,
        metrics: { diffMs: 0, parseMs: 0 },
        nextRevision: 2,
        patches: [
          {
            blockId: 'renderer:block-1',
            blockIndex: 0,
            expectedSignature: 1,
            fallbackBlock: {
              blockId: 'renderer:block-1',
              html: '<p><strong>bold</strong> tail</p>',
              kind: 'paragraph',
              needsTools: false,
              signature: 2,
            },
            nextSignature: 2,
            op: 'tailAppendText',
            target: 'block-root',
            text: ' tail',
          },
        ],
        rendererId: 'renderer',
        reqId: 2,
      },
      passthrough,
    );

    expect(container.querySelector('.msr-content')?.textContent).toBe('bold tail');
    expect(container.querySelector('.msr-tools')?.textContent).toBe('');
  });

  it('treats the same next revision as an idempotent no-op', () => {
    const container = document.createElement('div');
    applyPatchResult(container, initialResult, passthrough);

    const repeated = applyPatchResult(container, initialResult, passthrough);

    expect(repeated.changedBlocks).toHaveLength(0);
    expect(container.querySelectorAll('.msr-block')).toHaveLength(1);
  });

  it('rejects a revision that does not match the DOM baseline', () => {
    const container = document.createElement('div');
    container.dataset.revision = '4';

    expect(() => applyPatchResult(container, initialResult, passthrough)).toThrow(RevisionConflictError);
  });
});

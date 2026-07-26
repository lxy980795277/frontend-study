import MarkdownIt from 'markdown-it';

import { assignBlockIds, type MarkdownBlock, type ParsedBlock } from '../diff/blocks';
import { diffBlocks } from '../diff/diff';
import { createSignature } from '../diff/signature';
import { groupTopLevelTokens } from '../diff/split-blocks';
import { generatePatches } from '../patch/generate';

const createBlock = (source: string, html: string, kind: MarkdownBlock['kind'] = 'paragraph'): MarkdownBlock => {
  return {
    blockId: 'block-1',
    html,
    kind,
    needsTools: kind === 'code' || kind === 'table',
    signature: createSignature(source),
    source,
  };
};

describe('Markdown block diff and patch', () => {
  it('groups top-level Markdown structures', () => {
    const parser = new MarkdownIt();
    const tokens = parser.parse('# Title\n\nParagraph\n\n```ts\nconst value = 1;\n```', {});
    const groups = groupTopLevelTokens(tokens);

    expect(groups.map((group) => group.kind)).toEqual(['heading', 'paragraph', 'code']);
  });

  it('finds the minimum changed block range', () => {
    const previous = [createBlock('A', '<p>A</p>'), createBlock('B', '<p>B</p>')];
    const next = [createBlock('A', '<p>A</p>'), createBlock('C', '<p>C</p>'), createBlock('D', '<p>D</p>')];

    expect(diffBlocks(previous, next)).toEqual({
      deleteCount: 1,
      insertCount: 2,
      start: 1,
    });
  });

  it('keeps the tail block identity during append-only updates', () => {
    const previous = [createBlock('hello', '<p>hello</p>')];
    const parsed: ParsedBlock[] = [
      {
        html: '<p>hello world</p>',
        kind: 'paragraph',
        needsTools: false,
        signature: createSignature('hello world'),
        source: 'hello world',
      },
    ];

    const next = assignBlockIds(previous, parsed, () => 'new-block');

    expect(next.at(0)?.blockId).toBe('block-1');
  });

  it('uses a block-root append for text after nested inline markup', () => {
    const previous = createBlock('**bold**', '<p><strong>bold</strong></p>\n');
    const next = createBlock('**bold** tail', '<p><strong>bold</strong> tail</p>\n');

    const patches = generatePatches([previous], [next]);

    expect(patches[0]).toMatchObject({
      op: 'tailAppendText',
      target: 'block-root',
      text: ' tail',
    });
  });

  it('uses the code target while a fence is still streaming', () => {
    const previous = createBlock('```ts\nconst', '<pre><code class="language-ts">const</code></pre>\n', 'code');
    const next = createBlock('```ts\nconst value', '<pre><code class="language-ts">const value</code></pre>\n', 'code');

    const patches = generatePatches([previous], [next]);

    expect(patches[0]).toMatchObject({
      op: 'tailAppendText',
      target: 'code',
      text: ' value',
    });
  });

  it('falls back when a streaming fence changes structure', () => {
    const previous = createBlock('```ts\nconst value = 1;', '<pre><code>const value = 1;</code></pre>\n', 'code');
    const next = createBlock('```ts\nconst value = 1;\n```', '<pre><code>const value = 1;\n</code></pre>\n', 'code');

    expect(generatePatches([previous], [next]).at(0)?.op).toBe('tailAppendFallbackHtml');
  });
});

import type MarkdownIt from 'markdown-it';

import type { BlockKind } from './blocks';

type MarkdownToken = ReturnType<MarkdownIt['parse']>[number];

export interface TokenGroup {
  endLine: number;
  kind: BlockKind;
  startLine: number;
  tokens: MarkdownToken[];
}

export function groupTopLevelTokens(tokens: MarkdownToken[]): TokenGroup[] {
  const groups: TokenGroup[] = [];
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index];
    if (!token) {
      break;
    }

    if (token.level !== 0) {
      index += 1;
      continue;
    }

    if (token.nesting !== 1) {
      groups.push(createGroup([token]));
      index += 1;
      continue;
    }

    const start = index;
    let depth = 0;

    do {
      const nestedToken = tokens[index];
      if (!nestedToken) {
        break;
      }
      depth += nestedToken.nesting;
      index += 1;
    } while (index < tokens.length && depth > 0);

    groups.push(createGroup(tokens.slice(start, index)));
  }

  return groups;
}

function createGroup(tokens: MarkdownToken[]): TokenGroup {
  const mappedToken = tokens.find((token) => token.map !== null);
  const lineRange = mappedToken?.map ?? [0, 0];
  const [startLine = 0, endLine = startLine] = lineRange;
  const firstToken = tokens[0];

  return {
    endLine,
    kind: getBlockKind(firstToken?.type ?? 'paragraph_open'),
    startLine,
    tokens,
  };
}

function getBlockKind(type: string): BlockKind {
  const kindByToken: Record<string, BlockKind> = {
    blockquote_open: 'quote',
    bullet_list_open: 'list',
    code_block: 'code',
    fence: 'code',
    heading_open: 'heading',
    hr: 'hr',
    html_block: 'html',
    ordered_list_open: 'list',
    table_open: 'table',
  };

  return kindByToken[type] ?? 'paragraph';
}

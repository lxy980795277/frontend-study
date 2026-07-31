import type { BlockKind, MarkdownToken, TokenGroup } from '../../types/markdown';

export const groupTopLevelTokens = (tokens: MarkdownToken[]): TokenGroup[] => {
  const groups: TokenGroup[] = [];
  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index]!;
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
      const nestedToken = tokens[index]!;
      depth += nestedToken.nesting;
      index += 1;
    } while (index < tokens.length && depth > 0);
    groups.push(createGroup(tokens.slice(start, index)));
  }
  return groups;
};
const createGroup = (tokens: MarkdownToken[]): TokenGroup => {
  const mappedToken = tokens.find((token) => {
    return token.map !== null;
  });
  const lineRange = mappedToken?.map ?? [0, 0];
  const [startLine = 0, endLine = startLine] = lineRange;
  const firstToken = tokens[0]!;
  return {
    endLine,
    kind: getBlockKind(firstToken.type),
    startLine,
    tokens,
  };
};
const getBlockKind = (type: string): BlockKind => {
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
};

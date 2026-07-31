import MarkdownIt from 'markdown-it';
import { createSignature } from '../core/diff/signature';
import { groupTopLevelTokens } from '../core/diff/split-blocks';
import type { ParsedBlock } from '../types/markdown';
const markdownParser = new MarkdownIt({
  breaks: false,
  html: true,
  linkify: true,
});
const defaultLinkOpen =
  markdownParser.renderer.rules.link_open ??
  ((tokens, index, options, _environment, renderer) => {
    return renderer.renderToken(tokens, index, options);
  });
markdownParser.renderer.rules.link_open = (tokens, index, options, environment, renderer) => {
  const token = tokens[index];
  if (token) {
    token.attrSet('rel', 'noopener noreferrer');
    token.attrSet('target', '_blank');
  }
  return defaultLinkOpen(tokens, index, options, environment, renderer);
};
export const parseMarkdownBlocks = (content: string): ParsedBlock[] => {
  const source = stripFrontMatter(content);
  const lines = source.split('\n');
  const groups = groupTopLevelTokens(markdownParser.parse(source, {}));
  return groups.map((group) => {
    const blockSource = lines.slice(group.startLine, group.endLine).join('\n');
    return {
      html: markdownParser.renderer.render(group.tokens, markdownParser.options, {}),
      kind: group.kind,
      needsTools: group.kind === 'code' || group.kind === 'table',
      signature: createSignature(blockSource),
      source: blockSource,
    };
  });
};
export const renderMarkdown = (content: string): string => {
  return markdownParser.render(stripFrontMatter(content));
};
const stripFrontMatter = (content: string): string => {
  if (!content.startsWith('---\n')) {
    return content;
  }
  const closingMarker = content.indexOf('\n---', 4);
  if (closingMarker === -1) {
    return content;
  }
  const contentStart = content.indexOf('\n', closingMarker + 1);
  return contentStart === -1 ? '' : content.slice(contentStart + 1);
};

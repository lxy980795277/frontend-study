import type { MarkdownRenderingLabMode } from '../types/controller';

export const parseMarkdownRenderingLabMode = (value: string | null): MarkdownRenderingLabMode => {
  return value === 'benchmark' ? 'benchmark' : 'compare';
};

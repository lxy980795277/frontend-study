export type MarkdownRenderingLabMode = 'benchmark' | 'compare';

export function parseMarkdownRenderingLabMode(value: string | null): MarkdownRenderingLabMode {
  return value === 'benchmark' ? 'benchmark' : 'compare';
}

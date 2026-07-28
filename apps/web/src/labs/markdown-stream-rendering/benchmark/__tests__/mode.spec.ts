import { parseMarkdownRenderingLabMode } from '../mode';

describe('parseMarkdownRenderingLabMode', () => {
  it('accepts benchmark and falls back to compare for missing or invalid values', () => {
    expect(parseMarkdownRenderingLabMode('benchmark')).toBe('benchmark');
    expect(parseMarkdownRenderingLabMode('compare')).toBe('compare');
    expect(parseMarkdownRenderingLabMode('invalid')).toBe('compare');
    expect(parseMarkdownRenderingLabMode(null)).toBe('compare');
  });
});

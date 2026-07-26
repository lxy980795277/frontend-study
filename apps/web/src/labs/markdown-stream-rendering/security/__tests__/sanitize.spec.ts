import { sanitizeMarkdownHtml } from '../sanitize';

describe('sanitizeMarkdownHtml', () => {
  it('removes scripts, event handlers and dangerous protocols', () => {
    const sanitized = sanitizeMarkdownHtml(
      '<script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">link</a>',
    );

    expect(sanitized).not.toContain('<script');
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('javascript:');
  });

  it('adds safe external link attributes', () => {
    const sanitized = sanitizeMarkdownHtml('<a href="https://example.com">link</a>');

    expect(sanitized).toContain('target="_blank"');
    expect(sanitized).toContain('rel="noopener noreferrer"');
  });
});

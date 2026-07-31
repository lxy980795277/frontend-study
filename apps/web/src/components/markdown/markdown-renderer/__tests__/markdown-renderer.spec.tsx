import { render, screen } from '@testing-library/react';
import { MarkdownRenderer } from '@/components/markdown/markdown-renderer';
const MARKDOWN_FIXTURE = [
  '# 流式渲染',
  '',
  '- 支持列表',
  '- 支持 **强调**',
  '',
  '| 能力 | 状态 |',
  '| --- | --- |',
  '| GFM | ready |',
  '',
  '[查看文档](https://example.com/docs)',
  '',
  '`Last-Event-ID`',
].join('\n');
const RAW_HTML_FIXTURE = '<script>alert("unsafe")</script><b>raw</b>';
describe('MarkdownRenderer', () => {
  it('renders common Markdown and GFM structures', () => {
    render(<MarkdownRenderer content={MARKDOWN_FIXTURE} />);
    expect(screen.getByRole('heading', { name: '流式渲染' })).toBeTruthy();
    expect(screen.getByRole('list')).toBeTruthy();
    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getByText('Last-Event-ID').tagName).toBe('CODE');
    const link = screen.getByRole('link', { name: '查看文档' });
    expect(link.getAttribute('href')).toBe('https://example.com/docs');
    expect(link.getAttribute('rel')).toBe('noreferrer noopener');
    expect(link.getAttribute('target')).toBe('_blank');
  });
  it('does not render raw HTML from Markdown content', () => {
    const { container } = render(<MarkdownRenderer content={RAW_HTML_FIXTURE} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
  });
});

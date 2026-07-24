import type { FC } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@/utils/cn';

interface MarkdownRendererProps {
  className?: string;
  content: string;
}

const MARKDOWN_COMPONENTS: Components = {
  a: ({ children, href }) => {
    return (
      <a
        className="font-medium text-primary underline decoration-primary/35 underline-offset-4 transition-colors hover:decoration-primary"
        href={href}
        rel="noreferrer noopener"
        target="_blank"
      >
        {children}
      </a>
    );
  },
  blockquote: ({ children }) => {
    return <blockquote className="border-l-2 border-primary/35 pl-4 text-muted-foreground">{children}</blockquote>;
  },
  code: ({ children, className }) => {
    return <code className={cn('rounded bg-muted px-1.5 py-0.5 font-mono text-[0.875em]', className)}>{children}</code>;
  },
  h1: ({ children }) => {
    return <h1 className="mt-6 text-xl leading-8 font-semibold tracking-tight first:mt-0">{children}</h1>;
  },
  h2: ({ children }) => {
    return <h2 className="mt-6 text-lg leading-7 font-semibold tracking-tight first:mt-0">{children}</h2>;
  },
  h3: ({ children }) => {
    return <h3 className="mt-5 text-base leading-7 font-semibold first:mt-0">{children}</h3>;
  },
  hr: () => {
    return <hr className="my-5 border-border" />;
  },
  li: ({ children }) => {
    return <li className="pl-1">{children}</li>;
  },
  ol: ({ children }) => {
    return <ol className="my-3 list-decimal space-y-1.5 pl-6">{children}</ol>;
  },
  p: ({ children }) => {
    return <p className="my-3 leading-7 first:mt-0 last:mb-0">{children}</p>;
  },
  pre: ({ children }) => {
    return (
      <pre className="my-4 overflow-x-auto rounded-lg border bg-muted/65 p-4 text-xs leading-6 [&>code]:bg-transparent [&>code]:p-0">
        {children}
      </pre>
    );
  },
  table: ({ children }) => {
    return (
      <div className="my-4 overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-left text-sm">{children}</table>
      </div>
    );
  },
  td: ({ children }) => {
    return <td className="border-t px-3 py-2 align-top">{children}</td>;
  },
  th: ({ children }) => {
    return <th className="bg-muted/70 px-3 py-2 font-medium">{children}</th>;
  },
  ul: ({ children }) => {
    return <ul className="my-3 list-disc space-y-1.5 pl-6">{children}</ul>;
  },
};

export const MarkdownRenderer: FC<MarkdownRendererProps> = ({ className, content }) => {
  return (
    <div className={cn('min-w-0 break-words', className)}>
      <ReactMarkdown skipHtml components={MARKDOWN_COMPONENTS} remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

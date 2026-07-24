import type { ComponentProps, FC } from 'react';

import { cn } from '@/utils/cn';

export const Textarea: FC<ComponentProps<'textarea'>> = ({ className, ...props }) => {
  return (
    <textarea
      className={cn(
        'flex min-h-20 w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
};

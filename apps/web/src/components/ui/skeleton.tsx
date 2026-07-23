import type { HTMLAttributes, FC } from 'react';

import { cn } from '@/utils/cn';

export const Skeleton: FC<HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
};

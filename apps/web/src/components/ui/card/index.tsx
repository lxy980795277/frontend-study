import type { HTMLAttributes, FC } from 'react';

import { cn } from '@/utils/cn';

export const Card: FC<HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return <div className={cn('rounded-xl border bg-card text-card-foreground shadow-sm', className)} {...props} />;
};

export const CardHeader: FC<HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return <div className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />;
};

export const CardTitle: FC<HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => {
  return <h3 className={cn('leading-none font-semibold tracking-tight', className)} {...props} />;
};

export const CardDescription: FC<HTMLAttributes<HTMLParagraphElement>> = ({ className, ...props }) => {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
};

export const CardContent: FC<HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
};

'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ComponentProps, FC } from 'react';

import { cn } from '@/utils/cn';

export const Tabs = TabsPrimitive.Root;

export const TabsList: FC<ComponentProps<typeof TabsPrimitive.List>> = ({ className, ...props }) => {
  return (
    <TabsPrimitive.List
      className={cn('inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground', className)}
      {...props}
    />
  );
};

export const TabsTrigger: FC<ComponentProps<typeof TabsPrimitive.Trigger>> = ({ className, ...props }) => {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex h-7 items-center justify-center rounded-md px-3 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        className,
      )}
      {...props}
    />
  );
};

export const TabsContent: FC<ComponentProps<typeof TabsPrimitive.Content>> = ({ className, ...props }) => {
  return <TabsPrimitive.Content className={cn('mt-4 outline-none', className)} {...props} />;
};

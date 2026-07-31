'use client';
import * as SliderPrimitive from '@radix-ui/react-slider';
import type { ComponentProps, FC } from 'react';
import { cn } from '@/utils/cn';
export const Slider: FC<ComponentProps<typeof SliderPrimitive.Root>> = ({ className, ...props }) => {
  return (
    <SliderPrimitive.Root
      className={cn('relative flex w-full touch-none items-center select-none', className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-4 rounded-full border border-primary/30 bg-background shadow-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  );
};

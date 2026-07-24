'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes, FC } from 'react';

import { cn } from '@/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default: 'h-9 px-4 py-2',
        icon: 'size-9',
        lg: 'h-10 px-6',
        sm: 'h-8 px-3 text-xs',
      },
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        outline: 'border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      },
    },
  },
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button: FC<ButtonProps> = ({ asChild = false, className, size, type = 'button', variant, ...props }) => {
  const mergedClassName = cn(buttonVariants({ className, size, variant }));

  if (asChild) {
    return <Slot className={mergedClassName} {...props} />;
  }

  return <button className={mergedClassName} type={type} {...props} />;
};

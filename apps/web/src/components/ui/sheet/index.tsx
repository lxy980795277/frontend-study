'use client';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentProps, FC } from 'react';
import { cn } from '@/utils/cn';
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetContent: FC<ComponentProps<typeof DialogPrimitive.Content>> = ({ children, className, ...props }) => {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/35 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=open]:animate-in" />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col border-r bg-background shadow-xl outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:animate-in data-[state=open]:slide-in-from-left',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          <X aria-hidden className="size-4" />
          <span className="sr-only">关闭</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
};
export const SheetHeader: FC<ComponentProps<'div'>> = ({ className, ...props }) => {
  return <div className={cn('space-y-1.5 border-b p-6', className)} {...props} />;
};
export const SheetTitle: FC<ComponentProps<typeof DialogPrimitive.Title>> = ({ className, ...props }) => {
  return <DialogPrimitive.Title className={cn('font-semibold', className)} {...props} />;
};
export const SheetDescription: FC<ComponentProps<typeof DialogPrimitive.Description>> = ({ className, ...props }) => {
  return <DialogPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />;
};

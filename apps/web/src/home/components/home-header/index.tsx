import { ArrowRight, FlaskConical } from 'lucide-react';
import Link from 'next/link';
import type { FC } from 'react';
import { Button } from '@/components/ui/button';
export const HomeHeader: FC = () => {
  return (
    <header className="border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
        <Link className="flex min-w-0 items-center gap-3" href="/home">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <FlaskConical aria-hidden className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">AI Frontend Engineering Lab</span>
            <span className="hidden truncate text-xs text-muted-foreground sm:block">Advanced frontend systems</span>
          </span>
        </Link>

        <Button asChild size="sm" variant="outline">
          <Link href="/labs">
            Labs
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
};

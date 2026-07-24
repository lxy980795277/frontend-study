import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

interface LabDetailLayoutProps {
  children: ReactNode;
}

export default function LabDetailLayout({ children }: LabDetailLayoutProps) {
  return (
    <div className="relative min-h-dvh [&>main]:px-5 [&>main]:py-5 sm:[&>main]:px-6 sm:[&>main]:py-6 lg:[&>main]:px-8 lg:[&>main]:py-7">
      <nav
        aria-label="Lab 页面导航"
        className="flex justify-end pt-3 pr-16 pl-3 sm:absolute sm:top-4 sm:right-16 sm:z-30 sm:p-0"
      >
        <Button asChild size="sm" variant="outline">
          <Link href="/labs">
            <ArrowLeft aria-hidden className="size-4" />
            返回 Labs
          </Link>
        </Button>
      </nav>
      {children}
    </div>
  );
}

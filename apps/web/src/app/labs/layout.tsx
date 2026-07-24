import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  description: '独立的前端高阶工程实验工作台',
  title: 'Labs · AI Frontend Engineering Lab',
};

interface LabsLayoutProps {
  children: ReactNode;
}

export default function LabsLayout({ children }: LabsLayoutProps) {
  return <div className="min-h-dvh bg-background">{children}</div>;
}

'use client';

import { FlaskConical, Home, LayoutGrid, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { FC, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { LAB_REGISTRY } from '@/config/lab-registry';
import { useUiStore } from '@/stores/ui.store';
import { cn } from '@/utils/cn';

interface LabsShellProps {
  children: ReactNode;
}

const getSidebarWidth = (collapsed: boolean): string => {
  if (collapsed) {
    return 'w-20';
  }

  return 'w-72';
};

const getNavigationClassName = (active: boolean, collapsed: boolean): string => {
  return cn(
    'flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors',
    collapsed && 'justify-center',
    active && 'bg-accent font-medium text-accent-foreground',
    !active && 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
  );
};

const isLabActive = (pathname: string, route: string): boolean => {
  return pathname === route || pathname.startsWith(`${route}/`);
};

export const LabsShell: FC<LabsShellProps> = ({ children }) => {
  const pathname = usePathname();
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  let ToggleIcon = PanelLeftClose;
  let toggleLabel = '收起侧边栏';
  if (sidebarCollapsed) {
    ToggleIcon = PanelLeftOpen;
    toggleLabel = '展开侧边栏';
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r bg-card/90 backdrop-blur transition-[width] duration-200 md:flex',
          getSidebarWidth(sidebarCollapsed),
        )}
      >
        <Link aria-label="从侧边栏返回 Home" className="flex h-16 items-center gap-3 border-b px-5" href="/">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <FlaskConical aria-hidden className="size-5" />
          </span>
          {!sidebarCollapsed && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">Frontend Lab</span>
              <span className="block truncate text-xs text-muted-foreground">返回 Home</span>
            </span>
          )}
        </Link>

        <nav aria-label="Labs 模块" className="flex-1 overflow-y-auto p-3">
          <Link
            aria-label="Labs 概览"
            className={getNavigationClassName(pathname === '/labs', sidebarCollapsed)}
            href="/labs"
          >
            <LayoutGrid aria-hidden className="size-4 shrink-0" />
            {!sidebarCollapsed && <span>Labs 概览</span>}
          </Link>

          {!sidebarCollapsed && (
            <div className="mt-6">
              <p className="px-3 text-[0.6875rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                实验模块
              </p>
              {LAB_REGISTRY.length === 0 && (
                <p className="mt-3 rounded-lg border border-dashed px-3 py-4 text-xs leading-5 text-muted-foreground">
                  暂无实验模块
                </p>
              )}
            </div>
          )}

          <div className="mt-2 space-y-1">
            {LAB_REGISTRY.map((lab) => {
              return (
                <Link
                  key={lab.slug}
                  aria-label={lab.title}
                  className={getNavigationClassName(isLabActive(pathname, lab.route), sidebarCollapsed)}
                  href={lab.route}
                >
                  <FlaskConical aria-hidden className="size-4 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{lab.title}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t p-3">
          <Button
            aria-label={toggleLabel}
            className={cn('w-full', !sidebarCollapsed && 'justify-start')}
            size="sm"
            variant="ghost"
            onClick={toggleSidebar}
          >
            <ToggleIcon aria-hidden className="size-4 shrink-0" />
            {!sidebarCollapsed && <span>{toggleLabel}</span>}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/85 px-5 backdrop-blur lg:px-8">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Labs 工作台</p>
            <p className="truncate text-xs text-muted-foreground">独立实验模块与技术验证</p>
          </div>
          <Link
            aria-label="返回 Home"
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            href="/"
          >
            <Home aria-hidden className="size-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </header>

        <nav
          aria-label="移动端 Labs 模块"
          className="flex shrink-0 gap-2 overflow-x-auto border-b bg-card/60 px-5 py-3 md:hidden"
        >
          <Link className={getNavigationClassName(pathname === '/labs', false)} href="/labs">
            Labs 概览
          </Link>
          {LAB_REGISTRY.map((lab) => {
            return (
              <Link
                key={lab.slug}
                className={getNavigationClassName(isLabActive(pathname, lab.route), false)}
                href={lab.route}
              >
                {lab.title}
              </Link>
            );
          })}
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8 lg:py-10">{children}</div>
        </main>
      </div>
    </div>
  );
};

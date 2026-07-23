import type { HealthComponentStatus } from '@frontend-study/shared-types';
import { CheckCircle2, CircleAlert, type LucideIcon } from 'lucide-react';
import type { FC } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';

interface HealthCardProps {
  description: string;
  latencyMs?: number;
  name: string;
  status: HealthComponentStatus;
}

interface StatusPresentation {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
}

const STATUS_PRESENTATION: Record<HealthComponentStatus, StatusPresentation> = {
  down: {
    icon: CircleAlert,
    iconClassName: 'bg-destructive/10 text-destructive',
    label: '不可用',
  },
  up: {
    icon: CheckCircle2,
    iconClassName: 'bg-success/10 text-success',
    label: '运行正常',
  },
};

export const HealthCard: FC<HealthCardProps> = ({ description, latencyMs, name, status }) => {
  const presentation = STATUS_PRESENTATION[status];
  const StatusIcon = presentation.icon;

  let latencyText = '已连接';
  if (latencyMs !== undefined) {
    latencyText = `${latencyMs} ms`;
  }

  return (
    <Card className="border-border/80 shadow-none">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', presentation.iconClassName)}>
          <StatusIcon aria-hidden className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium">{name}</p>
            <span className="font-mono text-xs text-muted-foreground">{latencyText}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <p className="mt-2 text-xs font-medium">{presentation.label}</p>
        </div>
      </CardContent>
    </Card>
  );
};

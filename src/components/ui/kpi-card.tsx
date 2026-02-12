import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  className?: string;
  iconClassName?: string;
}

export function KPICard({
  title,
  value,
  icon: Icon,
  change,
  changeType = 'neutral',
  className,
  iconClassName,
}: KPICardProps) {
  return (
    <div
      className={cn(
        'bg-card border border-border rounded-xl p-5 transition-all duration-200 hover:shadow-premium group',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold font-display tracking-tight text-foreground">
            {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
          </p>
          {change && (
            <p
              className={cn(
                'text-xs font-medium',
                changeType === 'positive' && 'text-success',
                changeType === 'negative' && 'text-destructive',
                changeType === 'neutral' && 'text-muted-foreground'
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200',
            'bg-primary/10 group-hover:bg-primary/20',
            iconClassName
          )}
        >
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  );
}

interface MagicFormulaItemProps {
  label: string;
  status: 'complete' | 'warning' | 'pending';
}

export function MagicFormulaItem({ label, status }: MagicFormulaItemProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold',
          status === 'complete' && 'bg-success/20 text-success',
          status === 'warning' && 'bg-warning/20 text-warning',
          status === 'pending' && 'bg-muted text-muted-foreground'
        )}
      >
        {status === 'complete' && '✓'}
        {status === 'warning' && '!'}
        {status === 'pending' && '○'}
      </div>
      <span className={cn('text-sm', status === 'complete' ? 'text-foreground' : 'text-muted-foreground')}>
        {label}
      </span>
    </div>
  );
}

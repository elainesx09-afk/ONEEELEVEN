import { cn } from '@/lib/utils';

type StatusType = 'connected' | 'disconnected' | 'connecting' | 'active' | 'inactive' | 'warning' | 'success' | 'error';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  showDot?: boolean;
  className?: string;
}

const statusStyles: Record<StatusType, { dot: string; badge: string; text: string }> = {
  connected: {
    dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    badge: 'bg-emerald-500/10 border-emerald-500/30',
    text: 'text-emerald-400',
  },
  active: {
    dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    badge: 'bg-emerald-500/10 border-emerald-500/30',
    text: 'text-emerald-400',
  },
  success: {
    dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    badge: 'bg-emerald-500/10 border-emerald-500/30',
    text: 'text-emerald-400',
  },
  disconnected: {
    dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]',
    badge: 'bg-red-500/10 border-red-500/30',
    text: 'text-red-400',
  },
  inactive: {
    dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]',
    badge: 'bg-red-500/10 border-red-500/30',
    text: 'text-red-400',
  },
  error: {
    dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]',
    badge: 'bg-red-500/10 border-red-500/30',
    text: 'text-red-400',
  },
  connecting: {
    dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse',
    badge: 'bg-amber-500/10 border-amber-500/30',
    text: 'text-amber-400',
  },
  warning: {
    dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
    badge: 'bg-amber-500/10 border-amber-500/30',
    text: 'text-amber-400',
  },
};

const statusLabels: Record<StatusType, string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  connecting: 'Connecting...',
  active: 'Active',
  inactive: 'Inactive',
  warning: 'Warning',
  success: 'Success',
  error: 'Error',
};

export function StatusBadge({ status, label, showDot = true, className }: StatusBadgeProps) {
  const styles = statusStyles[status];
  const displayLabel = label || statusLabels[status];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium',
        styles.badge,
        styles.text,
        className
      )}
    >
      {showDot && <div className={cn('w-1.5 h-1.5 rounded-full', styles.dot)} />}
      {displayLabel}
    </div>
  );
}

export function StatusDot({ status, className }: { status: StatusType; className?: string }) {
  return <div className={cn('w-2 h-2 rounded-full', statusStyles[status].dot, className)} />;
}

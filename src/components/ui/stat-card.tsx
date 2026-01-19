import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const variantStyles = {
  default: 'bg-card',
  primary: 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20',
  success: 'bg-gradient-to-br from-status-completed/10 to-status-completed/5 border-status-completed/20',
  warning: 'bg-gradient-to-br from-status-pending/10 to-status-pending/5 border-status-pending/20',
  danger: 'bg-gradient-to-br from-status-blocked/10 to-status-blocked/5 border-status-blocked/20',
};

const iconVariantStyles = {
  default: 'bg-secondary text-muted-foreground',
  primary: 'bg-primary/20 text-primary',
  success: 'bg-status-completed/20 text-status-completed',
  warning: 'bg-status-pending/20 text-status-pending',
  danger: 'bg-status-blocked/20 text-status-blocked',
};

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: StatCardProps) => {
  return (
    <div
      className={cn(
        'p-6 rounded-xl border shadow-soft transition-all duration-200 hover:shadow-medium animate-fade-in',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  'text-sm font-medium',
                  trend.isPositive ? 'text-status-completed' : 'text-status-blocked'
                )}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">vs mês anterior</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-xl', iconVariantStyles[variant])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

const getProgressColor = (value: number): string => {
  if (value >= 100) return 'bg-status-completed';
  if (value >= 75) return 'bg-status-progress';
  if (value >= 50) return 'bg-status-pending';
  return 'bg-status-blocked';
};

export const ProgressBar = ({ 
  value, 
  showLabel = false, 
  size = 'md',
  className 
}: ProgressBarProps) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('flex-1 bg-secondary rounded-full overflow-hidden', sizeStyles[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            getProgressColor(clampedValue)
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-muted-foreground min-w-[3rem] text-right">
          {clampedValue}%
        </span>
      )}
    </div>
  );
};

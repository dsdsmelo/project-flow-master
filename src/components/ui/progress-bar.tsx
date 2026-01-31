import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: string; // Custom color (hex) or gradient class
  gradientClass?: string; // Tailwind gradient class (e.g., 'from-blue-500 to-cyan-400')
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
  className,
  color,
  gradientClass,
}: ProgressBarProps) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  // Determine if using custom color
  const useCustomColor = color || gradientClass;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('flex-1 bg-secondary rounded-full overflow-hidden', sizeStyles[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            !useCustomColor && getProgressColor(clampedValue),
            gradientClass && `bg-gradient-to-r ${gradientClass}`
          )}
          style={{
            width: `${clampedValue}%`,
            ...(color && !gradientClass ? { backgroundColor: color } : {})
          }}
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

import { cn } from '@/lib/utils';
import { useState } from 'react';

interface AvatarCircleProps {
  name: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  avatarUrl?: string;
}

const sizeStyles = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
  xl: 'w-16 h-16 text-xl',
};

export const AvatarCircle = ({ 
  name, 
  color = '#3B82F6', 
  size = 'md',
  className,
  avatarUrl
}: AvatarCircleProps) => {
  const [imageError, setImageError] = useState(false);
  
  const initials = name
    .split(' ')
    .map(word => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (avatarUrl && !imageError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        onError={() => setImageError(true)}
        className={cn(
          'rounded-full object-cover shadow-soft',
          sizeStyles[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white shadow-soft',
        sizeStyles[size],
        className
      )}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
};

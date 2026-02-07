import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Inline loading spinner
 */
export default function LoadingSpinner({ className, size = 'default' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <Loader2
      className={cn(
        'animate-spin text-muted-foreground',
        sizeClasses[size],
        className
      )}
    />
  );
}

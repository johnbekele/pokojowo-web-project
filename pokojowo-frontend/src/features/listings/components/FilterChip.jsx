import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FilterChip({ selected, onClick, children, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-[44px] items-center gap-2 rounded-full border-2 px-3 py-2.5 text-sm font-medium transition-all duration-200',
        'touch-manipulation active:scale-95',
        selected
          ? 'border-primary bg-primary text-primary-foreground shadow-md'
          : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-accent',
      )}
    >
      {icon && <span className="text-base">{icon}</span>}
      <span>{children}</span>
      {selected && <Check className="ml-1 h-4 w-4" />}
    </button>
  );
}

import { useTranslation } from 'react-i18next';
import { Home, Users } from 'lucide-react';

import { cn } from '@/lib/utils';

export const MAP_LAYERS = {
  FLATS: 'flats',
  FLATMATES: 'flatmates',
  BOTH: 'both',
};

/** Flats / Flatmates / Both. Defaults to flats — that's what /discover is for. */
export default function MapLayerToggle({ value, onChange, className }) {
  const { t } = useTranslation('listings');

  const options = [
    { id: MAP_LAYERS.FLATS, label: t('map.layers.flats', 'Flats'), icon: Home },
    { id: MAP_LAYERS.FLATMATES, label: t('map.layers.flatmates', 'Flatmates'), icon: Users },
    { id: MAP_LAYERS.BOTH, label: t('map.layers.both', 'Both'), icon: null },
  ];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/95 p-1 shadow-md backdrop-blur',
        className,
      )}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              selected
                ? 'bg-foreground text-background'
                : 'text-foreground/70 hover:bg-accent hover:text-foreground',
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

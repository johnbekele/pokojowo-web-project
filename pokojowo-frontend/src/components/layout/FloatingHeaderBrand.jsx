import { motion as Motion } from 'framer-motion';
import { Link } from 'react-router-dom';

/** Shared wordmark used by the desktop header and mobile drawer. */
export default function FloatingHeaderBrand({ compact = false }) {
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground">
          <span className="font-display text-lg font-semibold text-background">P</span>
        </div>
        <div className="leading-none">
          <span className="font-display text-lg font-medium text-foreground">Pokojowo</span>
          <p className="mt-0.5 text-[9px] uppercase tracking-[0.24em] text-muted-foreground">
            Editorial Rentals
          </p>
        </div>
      </div>
    );
  }

  return (
    <Link to="/" className="group/brand flex items-center gap-3">
      <Motion.div
        className="relative"
        whileHover={{ rotate: -2, scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 360, damping: 22 }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground shadow-[0_4px_18px_hsl(var(--surface-onyx)/0.18)]">
          <span className="font-display text-lg font-semibold text-background">P</span>
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-background" />
      </Motion.div>
      <div className="hidden flex-col leading-none sm:flex">
        <span className="font-display text-xl font-medium tracking-editorial text-foreground">
          Pokojowo
        </span>
        <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
          Editorial Rentals
        </span>
      </div>
    </Link>
  );
}

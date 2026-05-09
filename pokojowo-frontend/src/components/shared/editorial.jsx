import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Editorial layout & status primitives for the Pokojowo redesign.
 *
 * These are intentionally small wrappers that capture the long Tailwind
 * patterns we use repeatedly (eyebrows, decorative dividers, magazine-style
 * media frames, metric pills, trust markers). Keeping them in a single file
 * makes feature pages much more readable and keeps the visual language
 * consistent across the app.
 */

/* ---------- Section / Eyebrow / Display title ---------- */

export const EditorialSection = React.forwardRef(function EditorialSection(
  { className, as: Tag = 'section', ...props },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={cn('relative space-y-6', className)}
      {...props}
    />
  );
});

export function Eyebrow({ className, children, asChild = false, ...props }) {
  const Comp = asChild ? 'span' : 'p';
  return (
    <Comp
      className={cn('text-eyebrow text-muted-foreground', className)}
      {...props}
    >
      {children}
    </Comp>
  );
}

export function DisplayTitle({
  children,
  className,
  size = 'md',
  italicWord,
  as: Tag = 'h1',
}) {
  const sizes = {
    sm: 'text-display-sm',
    md: 'text-display-md',
    lg: 'text-display-lg',
  };
  return (
    <Tag
      className={cn(
        'font-display font-medium text-foreground',
        sizes[size] || sizes.md,
        className,
      )}
    >
      {children}
      {italicWord ? (
        <>
          {' '}
          <span className="font-display italic text-accent">
            {italicWord}
          </span>
        </>
      ) : null}
    </Tag>
  );
}

/* ---------- Decorative rule ---------- */

export function EditorialRule({ label, className }) {
  if (!label) {
    return (
      <div
        aria-hidden
        className={cn(
          'h-px w-full bg-gradient-to-r from-transparent via-border to-transparent',
          className,
        )}
      />
    );
  }
  return (
    <div className={cn('divider-rule', className)}>
      <span className="text-eyebrow">{label}</span>
    </div>
  );
}

/* ---------- Luxury surface panel ---------- */

export const LuxuryPanel = React.forwardRef(function LuxuryPanel(
  { className, tone = 'paper', children, ...props },
  ref,
) {
  const tones = {
    paper:
      'bg-card border-border/70 text-card-foreground shadow-editorial',
    parchment:
      'bg-surface-parchment border-border/60 text-foreground shadow-editorial',
    canvas:
      'bg-surface-canvas border-border/50 text-foreground',
    ink:
      'bg-surface-ink border-transparent text-[hsl(var(--surface-paper))] shadow-premium-lg',
    glass:
      'glass text-foreground',
  };
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border p-6 transition-colors duration-500',
        tones[tone] || tones.paper,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

/* ---------- Media frame ---------- */

export function MediaFrame({
  src,
  alt = '',
  className,
  imgClassName,
  fallbackSrc,
  rounded = 'rounded-3xl',
  aspect,
  children,
  ...props
}) {
  const [errored, setErrored] = React.useState(false);
  const finalSrc = errored && fallbackSrc ? fallbackSrc : src;
  return (
    <div
      className={cn(
        'media-frame relative overflow-hidden bg-surface-parchment',
        rounded,
        aspect,
        className,
      )}
      {...props}
    >
      {finalSrc ? (
        <img
          src={finalSrc}
          alt={alt}
          loading="lazy"
          onError={() => setErrored(true)}
          className={cn(
            'h-full w-full object-cover transition-transform [transition-duration:1400ms] ease-out group-hover/card:scale-[1.04]',
            imgClassName,
          )}
        />
      ) : null}
      {children}
    </div>
  );
}

/* ---------- Metric pill / stat ---------- */

export function MetricPill({
  icon: Icon,
  label,
  value,
  className,
  tone = 'default',
}) {
  const tones = {
    default:
      'bg-surface-paper border-border/70 text-foreground',
    accent:
      'bg-accent/10 border-accent/40 text-accent',
    olive:
      'bg-olive/10 border-olive/40 text-olive',
    ink:
      'bg-surface-ink border-transparent text-[hsl(var(--surface-paper))]',
  };
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium tracking-tight',
        tones[tone] || tones.default,
        className,
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {label ? (
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
      ) : null}
      <span className="font-semibold">{value}</span>
    </div>
  );
}

/* ---------- Trust badge ---------- */

export function TrustBadge({
  icon: Icon,
  children,
  tone = 'olive',
  className,
}) {
  const tones = {
    olive: 'bg-olive/10 text-olive border-olive/30',
    accent: 'bg-accent/10 text-accent border-accent/30',
    rose: 'bg-rose/10 text-rose border-rose/30',
    ink: 'bg-foreground/5 text-foreground border-border',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em]',
        tones[tone] || tones.olive,
        className,
      )}
    >
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {children}
    </span>
  );
}

/* ---------- Compatibility / score ring ---------- */

export function ScoreRing({ value = 0, size = 56, label }) {
  const radius = (size - 6) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * circ;
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-label={label || `${pct} percent compatibility`}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--border))"
          strokeWidth="3"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--accent))"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          fill="transparent"
          className="transition-all duration-700 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-base font-semibold leading-none tracking-tight text-foreground">
          {Math.round(pct)}
        </span>
        <span className="text-[8px] uppercase tracking-[0.18em] text-muted-foreground">
          fit
        </span>
      </span>
    </div>
  );
}

/* ---------- Page section header ---------- */

export function SectionHeader({
  eyebrow,
  title,
  italicWord,
  description,
  align = 'left',
  action,
  size = 'md',
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-end',
        align === 'center'
          ? 'sm:flex-col sm:items-center sm:text-center'
          : 'justify-between',
        className,
      )}
    >
      <div className={cn('space-y-3', align === 'center' && 'mx-auto max-w-2xl')}>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        {title ? (
          <DisplayTitle size={size} italicWord={italicWord} as="h2">
            {title}
          </DisplayTitle>
        ) : null}
        {description ? (
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex-shrink-0">{action}</div> : null}
    </div>
  );
}

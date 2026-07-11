import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, X, MapPin, Languages, Info } from 'lucide-react';
import UserAvatar from '@/components/shared/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { ScoreRing, TrustBadge } from '@/components/shared/editorial';
import { cn } from '@/lib/utils';
import { translateExplanation } from '../utils/explanations';

const SWIPE_THRESHOLD = 150;
const ROTATION_RANGE = 14;

/**
 * Editorial swipe card.
 * Looks like a magazine portrait page rather than a casual dating card.
 */
export default function SwipeCard({
  match,
  onSwipeLeft,
  onSwipeRight,
  onCardClick,
  isTop = false,
  style = {},
}) {
  const { t } = useTranslation('matching');
  const controls = useAnimation();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-ROTATION_RANGE, 0, ROTATION_RANGE]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const {
    user_id,
    firstname,
    lastname,
    photo,
    age,
    bio,
    location,
    compatibility_score,
    explanations,
    shared_languages,
    is_new_user,
  } = match;

  const score = Math.round(compatibility_score || 0);
  const user = { firstname, lastname, photo };
  const positivePoints = explanations?.filter((e) => e.impact === 'positive').slice(0, 2) || [];

  const handleDragEnd = (_, info) => {
    const { offset, velocity } = info;
    if (Math.abs(offset.x) > SWIPE_THRESHOLD || Math.abs(velocity.x) > 500) {
      const direction = offset.x > 0 ? 'right' : 'left';
      controls
        .start({
          x: direction === 'right' ? 600 : -600,
          opacity: 0,
          transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
        })
        .then(() => {
          if (direction === 'right') onSwipeRight?.(user_id);
          else onSwipeLeft?.(user_id);
        });
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } });
    }
  };

  const handleButtonSwipe = (direction) => {
    controls
      .start({
        x: direction === 'right' ? 600 : -600,
        opacity: 0,
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
      })
      .then(() => {
        if (direction === 'right') onSwipeRight?.(user_id);
        else onSwipeLeft?.(user_id);
      });
  };

  return (
    <motion.div
      className={cn(
        'absolute aspect-[3/4] w-full max-w-[400px] cursor-grab touch-none select-none active:cursor-grabbing',
        !isTop && 'pointer-events-none',
      )}
      style={{ x, rotate, ...style }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.85}
      onDragEnd={handleDragEnd}
      animate={controls}
      whileTap={{ scale: isTop ? 1.01 : 1 }}
    >
      <div
        className="relative h-full w-full overflow-hidden rounded-[2rem] bg-card shadow-premium-lg border border-border/70"
        onClick={() => onCardClick?.(match)}
      >
        {/* Photo */}
        <div className="absolute inset-0 bg-surface-parchment">
          {photo ? (
            <img
              src={photo}
              alt={`${firstname}'s portrait`}
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <UserAvatar user={user} size="xl" className="h-32 w-32" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-onyx/85 via-surface-onyx/15 to-transparent" />
        </div>

        {/* Yes / Pass overlays */}
        <motion.div
          className="absolute right-8 top-10 z-20 rotate-[10deg]"
          style={{ opacity: likeOpacity }}
        >
          <div className="rounded-2xl border-2 border-olive bg-olive/20 px-4 py-2 backdrop-blur">
            <span className="font-display text-2xl font-semibold uppercase tracking-[0.24em] text-olive">
              Yes
            </span>
          </div>
        </motion.div>

        <motion.div
          className="absolute left-8 top-10 z-20 -rotate-[10deg]"
          style={{ opacity: nopeOpacity }}
        >
          <div className="rounded-2xl border-2 border-rose bg-rose/20 px-4 py-2 backdrop-blur">
            <span className="font-display text-2xl font-semibold uppercase tracking-[0.24em] text-rose">
              Pass
            </span>
          </div>
        </motion.div>

        {/* Top markers */}
        <div className="absolute inset-x-5 top-5 z-10 flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <span className="rounded-full bg-surface-paper/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-foreground backdrop-blur">
              {firstname}
            </span>
            {is_new_user && (
              <TrustBadge tone="accent">New voice</TrustBadge>
            )}
            {match.trust_level === 'verified' && (
              <TrustBadge tone="olive">{t('trust.verified', 'Verified')}</TrustBadge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-full bg-surface-paper/85 p-2 text-foreground backdrop-blur transition-transform hover:scale-105"
              onClick={(e) => {
                e.stopPropagation();
                onCardClick?.(match);
              }}
              aria-label="More info"
            >
              <Info className="h-4 w-4" />
            </button>
            <div className="rounded-full bg-surface-paper/90 p-1 backdrop-blur shadow-lg">
              <ScoreRing value={score} size={56} />
            </div>
          </div>
        </div>

        {/* Bottom content */}
        <div className="absolute inset-x-0 bottom-0 z-10 space-y-3 p-6 text-white">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/65">
              {age ? `${age} · ` : ''}
              {location || ''}
            </p>
            <h2 className="font-display text-4xl font-medium leading-[1.05] tracking-editorial">
              {firstname}
              {lastname ? <span className="text-white/70 font-light"> {lastname[0]}.</span> : null}
            </h2>
          </div>

          {location && (
            <p className="flex items-center gap-1.5 text-xs text-white/75">
              <MapPin className="h-3 w-3" />
              {location}
            </p>
          )}

          {bio && (
            <p className="font-display text-sm font-light italic leading-relaxed text-white/85 line-clamp-2">
              "{bio}"
            </p>
          )}

          {positivePoints.length > 0 && (
            <ul className="space-y-1">
              {positivePoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-white/85">
                  <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-accent" />
                  <span className="line-clamp-1">{translateExplanation(t, point)}</span>
                </li>
              ))}
            </ul>
          )}

          {shared_languages?.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <Languages className="h-3 w-3 text-white/60" />
              {shared_languages.slice(0, 3).map((lang) => (
                <Badge key={lang} variant="editorial" className="bg-white/15 text-white border-white/20">
                  {lang}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {isTop && (
        <div className="absolute -bottom-24 left-0 right-0 flex justify-center gap-5">
          <motion.button
            className="flex h-14 w-14 items-center justify-center rounded-full border border-border/70 bg-surface-paper text-muted-foreground shadow-premium transition-colors hover:border-rose/50 hover:bg-rose/10 hover:text-rose"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={(e) => {
              e.stopPropagation();
              handleButtonSwipe('left');
            }}
            aria-label="Pass"
          >
            <X className="h-5 w-5" />
          </motion.button>

          <motion.button
            className="flex h-16 w-16 items-center justify-center rounded-full bg-foreground text-background shadow-premium-lg transition-colors hover:bg-surface-ink"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={(e) => {
              e.stopPropagation();
              handleButtonSwipe('right');
            }}
            aria-label="Like"
          >
            <ThumbsUp className="h-6 w-6" />
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { ThumbsUp, X, MapPin, Languages, Info, Home, Sparkles } from 'lucide-react';
import UserAvatar from '@/components/shared/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const SWIPE_THRESHOLD = 150;
const ROTATION_RANGE = 20;

export default function SwipeCard({
  match,
  onSwipeLeft,
  onSwipeRight,
  onCardClick,
  isTop = false,
  style = {}
}) {
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
    languages,
    compatibility_score,
    explanations,
    shared_languages,
    is_new_user,
  } = match;

  const score = Math.round(compatibility_score || 0);
  const user = { firstname, lastname, photo };
  const positivePoints = explanations?.filter(e => e.impact === 'positive').slice(0, 2) || [];

  const getScoreColor = (score) => {
    if (score >= 85) return 'from-green-500 to-emerald-600';
    if (score >= 70) return 'from-blue-500 to-indigo-600';
    if (score >= 55) return 'from-yellow-500 to-orange-600';
    return 'from-gray-400 to-gray-500';
  };

  const handleDragEnd = (_, info) => {
    const { offset, velocity } = info;

    if (Math.abs(offset.x) > SWIPE_THRESHOLD || Math.abs(velocity.x) > 500) {
      const direction = offset.x > 0 ? 'right' : 'left';
      controls.start({
        x: direction === 'right' ? 500 : -500,
        opacity: 0,
        transition: { duration: 0.3 }
      }).then(() => {
        if (direction === 'right') {
          onSwipeRight?.(user_id);
        } else {
          onSwipeLeft?.(user_id);
        }
      });
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 30 } });
    }
  };

  const handleButtonSwipe = (direction) => {
    controls.start({
      x: direction === 'right' ? 500 : -500,
      opacity: 0,
      transition: { duration: 0.3 }
    }).then(() => {
      if (direction === 'right') {
        onSwipeRight?.(user_id);
      } else {
        onSwipeLeft?.(user_id);
      }
    });
  };

  return (
    <motion.div
      className={cn(
        "absolute w-full max-w-[380px] aspect-[3/4] cursor-grab active:cursor-grabbing touch-none select-none",
        !isTop && "pointer-events-none"
      )}
      style={{ x, rotate, ...style }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      animate={controls}
      whileTap={{ scale: isTop ? 1.02 : 1 }}
    >
      {/* Card Container */}
      <div
        className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl bg-card border border-border"
        onClick={() => onCardClick?.(match)}
      >
        {/* Background gradient */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-b opacity-90",
          getScoreColor(score)
        )} />

        {/* Photo section */}
        <div className="absolute inset-0">
          {photo ? (
            <img
              src={photo}
              alt={`${firstname}'s photo`}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <UserAvatar user={user} size="xl" className="h-32 w-32" />
            </div>
          )}

          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>

        {/* Yes/Pass overlays */}
        <motion.div
          className="absolute top-8 right-8 z-20 rotate-12"
          style={{ opacity: likeOpacity }}
        >
          <div className="px-4 py-2 border-4 border-teal-500 rounded-lg bg-teal-500/20">
            <span className="text-3xl font-black text-teal-500">YES!</span>
          </div>
        </motion.div>

        <motion.div
          className="absolute top-8 left-8 z-20 -rotate-12"
          style={{ opacity: nopeOpacity }}
        >
          <div className="px-4 py-2 border-4 border-gray-400 rounded-lg bg-gray-400/20">
            <span className="text-3xl font-black text-gray-400">PASS</span>
          </div>
        </motion.div>

        {/* Compatibility Score Badge */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          {is_new_user && (
            <div className="flex items-center gap-1 px-3 py-2 rounded-full bg-amber-500 text-white shadow-lg">
              <Sparkles className="h-3 w-3" />
              <span className="text-xs font-bold">NEW</span>
            </div>
          )}
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 backdrop-blur-sm shadow-lg"
          )}>
            <Home className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-bold text-foreground">{score}% Compatible</span>
          </div>
        </div>

        {/* Info button */}
        <button
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/40 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onCardClick?.(match);
          }}
        >
          <Info className="h-5 w-5 text-white" />
        </button>

        {/* Content section */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          {/* Name and age */}
          <div className="mb-2">
            <h2 className="text-3xl font-bold">
              {firstname}{age ? `, ${age}` : ''}
            </h2>
            {location && (
              <div className="flex items-center gap-1 text-white/80 mt-1">
                <MapPin className="h-4 w-4" />
                <span>{location}</span>
              </div>
            )}
          </div>

          {/* Bio snippet */}
          {bio && (
            <p className="text-white/90 text-sm line-clamp-2 mb-3">
              {bio}
            </p>
          )}

          {/* Positive match points */}
          {positivePoints.length > 0 && (
            <div className="space-y-1 mb-3">
              {positivePoints.map((point, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-green-300">
                  <span className="text-green-400">✓</span>
                  <span className="line-clamp-1">{point.reason}</span>
                </div>
              ))}
            </div>
          )}

          {/* Languages */}
          {shared_languages?.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Languages className="h-4 w-4 text-white/70" />
              {shared_languages.slice(0, 3).map((lang) => (
                <Badge key={lang} className="bg-white/20 text-white border-0 text-xs">
                  {lang}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons - only show for top card */}
      {isTop && (
        <div className="absolute -bottom-20 left-0 right-0 flex justify-center gap-6">
          <motion.button
            className="w-16 h-16 rounded-full bg-white dark:bg-card shadow-xl flex items-center justify-center border-2 border-gray-300 dark:border-gray-600 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              handleButtonSwipe('left');
            }}
          >
            <X className="h-8 w-8" />
          </motion.button>

          <motion.button
            className="w-16 h-16 rounded-full bg-white dark:bg-card shadow-xl flex items-center justify-center border-2 border-teal-500 text-teal-500 hover:bg-teal-500 hover:text-white transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              handleButtonSwipe('right');
            }}
          >
            <ThumbsUp className="h-8 w-8" />
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

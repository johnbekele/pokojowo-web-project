import { useState, useRef } from 'react';
import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import useListingInteractionStore from '@/stores/listingInteractionStore';
import useAuthStore from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';

/**
 * ListingLikeButton - Heart button for saving/liking listings
 *
 * Features:
 * - Animated heart icon
 * - Optimistic updates (instant feedback)
 * - Auth check (redirects to login if not authenticated)
 */
export default function ListingLikeButton({
  listingId,
  className,
  size = 'default', // 'small' | 'default' | 'large'
  showLabel = false,
}) {
  const { t } = useTranslation('listings');
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isLiked, toggleLike } = useListingInteractionStore();
  const [animating, setAnimating] = useState(false);
  const pendingRef = useRef(false);

  const liked = isLiked(listingId);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if user is authenticated
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    // Prevent rapid double-clicks
    if (pendingRef.current) return;
    pendingRef.current = true;

    // Trigger animation for liking
    if (!liked) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 300);
    }

    // Optimistic update - no await, fire and forget
    toggleLike(listingId).finally(() => {
      pendingRef.current = false;
    });
  };

  const sizeClasses = {
    small: 'w-8 h-8',
    default: 'w-10 h-10',
    large: 'w-12 h-12',
  };

  const iconSizes = {
    small: 16,
    default: 20,
    large: 24,
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'relative flex items-center justify-center rounded-full transition-all duration-200',
        'bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-md',
        'hover:bg-white dark:hover:bg-gray-800 hover:shadow-lg',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'active:scale-95',
        sizeClasses[size],
        className
      )}
      title={liked ? t('actions.unlike') : t('actions.like')}
    >
      <Heart
        size={iconSizes[size]}
        className={cn(
          'transition-all duration-200',
          liked
            ? 'fill-red-500 text-red-500'
            : 'fill-transparent text-gray-500 hover:text-red-400',
          animating && 'scale-125'
        )}
      />

      {/* Like animation burst */}
      {animating && (
        <span className="absolute inset-0 rounded-full animate-ping bg-red-400/30" />
      )}

      {/* Optional label */}
      {showLabel && (
        <span className={cn(
          'ml-2 text-sm font-medium',
          liked ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'
        )}>
          {liked ? t('actions.liked') : t('actions.like')}
        </span>
      )}
    </button>
  );
}

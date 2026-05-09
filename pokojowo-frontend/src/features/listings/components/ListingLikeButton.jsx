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
        'relative flex items-center justify-center rounded-full border border-border/60 transition-all duration-300',
        'bg-surface-paper/90 backdrop-blur-md shadow-[0_2px_8px_hsl(var(--surface-onyx)/0.10)]',
        'hover:bg-surface-paper hover:border-border hover:shadow-[0_4px_18px_hsl(var(--surface-onyx)/0.14)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'active:scale-95',
        sizeClasses[size],
        className,
      )}
      title={liked ? t('actions.unlike') : t('actions.like')}
    >
      <Heart
        size={iconSizes[size]}
        className={cn(
          'transition-all duration-300',
          liked ? 'fill-rose text-rose' : 'fill-transparent text-muted-foreground hover:text-rose',
          animating && 'scale-125',
        )}
      />

      {animating && (
        <span className="absolute inset-0 rounded-full animate-ping bg-rose/30" />
      )}

      {showLabel && (
        <span
          className={cn(
            'ml-2 text-sm font-medium',
            liked ? 'text-rose' : 'text-muted-foreground',
          )}
        >
          {liked ? t('actions.liked') : t('actions.like')}
        </span>
      )}
    </button>
  );
}

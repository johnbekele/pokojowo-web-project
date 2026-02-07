import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import useLikesStore from '@/stores/likesStore';
import { useToast } from '@/hooks/useToast';

export default function LikeButton({
  userId,
  variant = 'outline',
  size = 'icon',
  className,
  showLabel = false,
  onMutualMatch,
}) {
  const { hasLiked, toggleLike, isMutualMatch } = useLikesStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { toast } = useToast();

  const liked = hasLiked(userId);
  const mutual = isMutualMatch(userId);

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);
    setIsAnimating(true);

    const result = await toggleLike(userId);

    setIsLoading(false);
    setTimeout(() => setIsAnimating(false), 300);

    if (result.success) {
      if (result.data?.is_mutual) {
        // Mutual match!
        onMutualMatch?.(result.data.mutual_match);
        toast({
          title: "It's a Match!",
          description: 'You both liked each other. Start chatting now!',
        });
      } else if (!liked) {
        toast({
          title: 'Liked!',
          description: 'Your like has been sent.',
        });
      }
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      variant={liked ? 'default' : variant}
      size={size}
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        'transition-all duration-200 group',
        liked && 'bg-pink-500 hover:bg-pink-600 text-white',
        mutual && 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600',
        isAnimating && 'scale-110',
        className
      )}
      title={mutual ? 'Mutual match!' : liked ? 'Unlike' : 'Like'}
    >
      <Heart
        className={cn(
          'h-4 w-4 transition-transform duration-200',
          showLabel && 'mr-2',
          liked && 'fill-current',
          isAnimating && 'animate-pulse',
          !liked && 'group-hover:scale-110'
        )}
      />
      {showLabel && (mutual ? 'Matched!' : liked ? 'Liked' : 'Like')}
    </Button>
  );
}

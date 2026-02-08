import { useState } from 'react';
import { ThumbsUp } from 'lucide-react';
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
        // Mutual connection!
        onMutualMatch?.(result.data.mutual_match);
        toast({
          title: "You're Connected!",
          description: 'You both showed interest. Start chatting now!',
        });
      } else if (!liked) {
        toast({
          title: 'Interest Sent!',
          description: 'They will be notified of your interest.',
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
        liked && 'bg-teal-500 hover:bg-teal-600 text-white',
        mutual && 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600',
        isAnimating && 'scale-110',
        className
      )}
      title={mutual ? 'Connected!' : liked ? 'Remove interest' : 'Show interest'}
    >
      <ThumbsUp
        className={cn(
          'h-4 w-4 transition-transform duration-200',
          showLabel && 'mr-2',
          liked && 'fill-current',
          isAnimating && 'animate-pulse',
          !liked && 'group-hover:scale-110'
        )}
      />
      {showLabel && (mutual ? 'Connected!' : liked ? 'Interested' : 'Interested?')}
    </Button>
  );
}

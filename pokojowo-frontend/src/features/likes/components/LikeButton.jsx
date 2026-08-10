import { useState } from 'react';
import { ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLikeStatus, useLikeUser, useUnlikeUser } from '@/hooks/useLikes';
import { useToast } from '@/hooks/useToast';

export default function LikeButton({
  userId,
  variant = 'outline',
  size = 'icon',
  className,
  showLabel = false,
  onMutualMatch,
}) {
  const { data: likeStatus, isLoading: isChecking } = useLikeStatus(userId);
  const likeMutation = useLikeUser();
  const unlikeMutation = useUnlikeUser();
  const [isAnimating, setIsAnimating] = useState(false);
  const { toast } = useToast();

  const liked = Boolean(likeStatus?.i_liked);
  const mutual = Boolean(likeStatus?.is_mutual);
  const isLoading = isChecking || likeMutation.isPending || unlikeMutation.isPending;

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setIsAnimating(true);
    try {
      const data = liked
        ? await unlikeMutation.mutateAsync(userId)
        : await likeMutation.mutateAsync(userId);

      if (data?.is_mutual) {
        // Mutual connection!
        onMutualMatch?.(data.mutual_match);
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
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Unable to update interest.',
        variant: 'destructive',
      });
    } finally {
      setIsAnimating(false);
    }
  };

  return (
    <Button
      variant={mutual ? 'olive' : liked ? 'default' : variant}
      size={size}
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        'group/like transition-all duration-300',
        isAnimating && 'scale-105',
        className,
      )}
      title={mutual ? 'Connected!' : liked ? 'Remove interest' : 'Show interest'}
    >
      <ThumbsUp
        className={cn(
          'h-4 w-4 transition-transform duration-300',
          showLabel && 'mr-1.5',
          liked && 'fill-current',
          isAnimating && 'animate-pulse',
          !liked && 'group-hover/like:scale-110',
        )}
      />
      {showLabel && (mutual ? 'Connected' : liked ? 'Interested' : 'Show interest')}
    </Button>
  );
}

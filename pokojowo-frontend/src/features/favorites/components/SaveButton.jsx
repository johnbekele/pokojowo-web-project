import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsSaved, useRemoveSaved, useSaveMatch } from '@/hooks/useFavorites';
import { useToast } from '@/hooks/useToast';

export default function SaveButton({
  userId,
  variant = 'outline',
  size = 'icon',
  className,
  showLabel = false,
}) {
  const { isSaved: saved, isLoading: isChecking } = useIsSaved(userId);
  const saveMutation = useSaveMatch();
  const removeMutation = useRemoveSaved();
  const { toast } = useToast();
  const isLoading = isChecking || saveMutation.isPending || removeMutation.isPending;

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (saved) {
        await removeMutation.mutateAsync({ userId });
      } else {
        await saveMutation.mutateAsync({ userId });
      }
      toast({
        title: saved ? 'Removed from saved' : 'Saved!',
        description: saved
          ? 'This profile has been removed from your saved list.'
          : 'This profile has been added to your saved list.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Unable to update saved profiles.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      variant={saved ? 'accent' : variant}
      size={size}
      onClick={handleToggle}
      disabled={isLoading}
      className={cn('transition-all duration-300', className)}
      title={saved ? 'Remove from shortlist' : 'Save to shortlist'}
    >
      {saved ? (
        <BookmarkCheck className={cn('h-4 w-4', showLabel && 'mr-1.5')} />
      ) : (
        <Bookmark className={cn('h-4 w-4', showLabel && 'mr-1.5')} />
      )}
      {showLabel && (saved ? 'Shortlisted' : 'Shortlist')}
    </Button>
  );
}

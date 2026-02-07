import { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import useFavoritesStore from '@/stores/favoritesStore';
import { useToast } from '@/hooks/useToast';

export default function SaveButton({
  userId,
  variant = 'outline',
  size = 'icon',
  className,
  showLabel = false,
}) {
  const { isSaved, toggleSave } = useFavoritesStore();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const saved = isSaved(userId);

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);
    const result = await toggleSave(userId);
    setIsLoading(false);

    if (result.success) {
      toast({
        title: saved ? 'Removed from saved' : 'Saved!',
        description: saved
          ? 'This profile has been removed from your saved list.'
          : 'This profile has been added to your saved list.',
      });
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
      variant={saved ? 'default' : variant}
      size={size}
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        'transition-all duration-200',
        saved && 'bg-amber-500 hover:bg-amber-600 text-white',
        className
      )}
      title={saved ? 'Remove from saved' : 'Save profile'}
    >
      {saved ? (
        <BookmarkCheck className={cn('h-4 w-4', showLabel && 'mr-2')} />
      ) : (
        <Bookmark className={cn('h-4 w-4', showLabel && 'mr-2')} />
      )}
      {showLabel && (saved ? 'Saved' : 'Save')}
    </Button>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bookmark,
  MessageSquare,
  MapPin,
  Trash2,
  Calendar,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import UserAvatar from '@/components/shared/UserAvatar';
import useFavoritesStore from '@/stores/favoritesStore';
import LikeButton from '@/features/likes/components/LikeButton';
import { formatDistanceToNow } from 'date-fns';

export default function SavedMatches() {
  const { t } = useTranslation('matching');
  const {
    savedMatches,
    savedCount,
    isLoading,
    error,
    fetchSavedMatches,
    removeSaved,
  } = useFavoritesStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    fetchSavedMatches();
  }, [fetchSavedMatches]);

  const handleRemove = async (userId) => {
    setRemoving(userId);
    await removeSaved(userId);
    setRemoving(null);
  };

  const filteredMatches = savedMatches.filter((match) => {
    if (!searchQuery) return true;
    const user = match.user;
    const searchLower = searchQuery.toLowerCase();
    return (
      user?.firstname?.toLowerCase().includes(searchLower) ||
      user?.lastname?.toLowerCase().includes(searchLower) ||
      user?.location?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading && savedMatches.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bookmark className="h-8 w-8 text-amber-500" />
            {t('favorites.title')}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t('favorites.profilesSaved', { count: savedCount })}
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('favorites.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {error && (
        <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
          <CardContent className="py-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Saved Matches Grid */}
      {filteredMatches.length === 0 ? (
        <Card>
          <CardHeader className="text-center py-12">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
              <Bookmark className="h-8 w-8 text-amber-500 dark:text-amber-400" />
            </div>
            <CardTitle>{t('favorites.empty.title')}</CardTitle>
            <CardDescription>
              {searchQuery
                ? t('favorites.empty.noSearchResults')
                : t('favorites.empty.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pb-8">
            <Link to="/matches">
              <Button>{t('favorites.browseMatches')}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMatches.map((savedMatch) => (
            <SavedMatchCard
              key={savedMatch.id}
              savedMatch={savedMatch}
              onRemove={handleRemove}
              isRemoving={removing === savedMatch.user_id}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SavedMatchCard({ savedMatch, onRemove, isRemoving, t }) {
  const { user, saved_at, notes, user_id } = savedMatch;

  if (!user) return null;

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <UserAvatar
              user={user}
              size="lg"
              className="h-14 w-14 ring-2 ring-amber-200"
            />
            <div>
              <CardTitle className="text-lg">
                {user.firstname} {user.lastname}
              </CardTitle>
              {user.location && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{user.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Remove button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                disabled={isRemoving}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('favorites.remove.title')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('favorites.remove.description', { name: user.firstname })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('favorites.remove.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onRemove(user_id)}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {t('favorites.remove.confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {/* Age and gender */}
        <div className="flex flex-wrap gap-2 mb-3">
          {user.age && (
            <Badge variant="secondary">{t('card.yearsOld', { age: user.age })}</Badge>
          )}
          {user.gender && (
            <Badge variant="outline" className="capitalize">
              {user.gender}
            </Badge>
          )}
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2 italic">
            "{user.bio}"
          </p>
        )}

        {/* Saved date */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3">
          <Calendar className="h-3 w-3" />
          <span>
            {t('favorites.saved', { time: formatDistanceToNow(new Date(saved_at), { addSuffix: true }) })}
          </span>
        </div>

        {/* Notes */}
        {notes && (
          <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-md">
            <p className="text-sm text-amber-800 dark:text-amber-300">{notes}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="bg-muted/50 gap-2 pt-4">
        <LikeButton
          userId={user_id}
          variant="outline"
          size="default"
          showLabel
          className="flex-1"
        />
        <Link to={`/matches/${user_id}`} className="flex-1">
          <Button variant="outline" className="w-full">
            {t('card.viewProfile')}
          </Button>
        </Link>
        <Link to={`/chat/with/${user_id}`}>
          <Button size="icon">
            <MessageSquare className="h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Play, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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
import { useToast } from '@/hooks/useToast';
import useSavedSearchStore from '@/stores/savedSearchStore';

// Build a compact, human-readable summary of a saved search's filters, e.g.
// "Kraków · Stare Miasto +1 · 1500–3000 zł · 20–40 m²". Falls back to the
// free-text term, then to "all listings" when nothing is constrained.
function filterSummary(s, t) {
  const parts = [];
  if (s.city) parts.push(s.city);
  if (s.districts?.length) {
    const [first, ...rest] = s.districts;
    parts.push(rest.length ? `${first} +${rest.length}` : first);
  }
  if (s.minPrice != null || s.maxPrice != null) {
    const min = s.minPrice != null ? s.minPrice : '';
    const max = s.maxPrice != null ? s.maxPrice : '';
    parts.push(`${min}–${max} zł`);
  }
  if (s.minSize != null || s.maxSize != null) {
    const min = s.minSize != null ? s.minSize : '';
    const max = s.maxSize != null ? s.maxSize : '';
    parts.push(`${min}–${max} m²`);
  }
  if (s.roomTypes?.length) parts.push(s.roomTypes.join(', '));
  if (parts.length) return parts.join(' · ');
  if (s.search) return `"${s.search}"`;
  return t('savedSearches.allListings', 'All listings');
}

/**
 * Manage the current user's saved searches: run, toggle match notifications,
 * and delete. Shown for every role (landlords search too). CRUD goes through
 * savedSearchStore (issue #75); "Run" deep-links to /discover?savedSearch=<id>.
 */
export default function SavedSearchesCard() {
  const { t } = useTranslation('profile');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { savedSearches, isLoading, fetchSavedSearches, updateSavedSearch, deleteSavedSearch } =
    useSavedSearchStore();
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    fetchSavedSearches();
  }, [fetchSavedSearches]);

  const handleToggle = async (search, notifyEnabled) => {
    setBusyId(search.id);
    const { success } = await updateSavedSearch(search.id, { notifyEnabled });
    setBusyId(null);
    if (!success) {
      toast({ title: t('savedSearches.updateFailed', 'Could not update the search'), variant: 'destructive' });
    }
  };

  const handleDelete = async (search) => {
    setBusyId(search.id);
    const { success } = await deleteSavedSearch(search.id);
    setBusyId(null);
    toast(
      success
        ? { title: t('savedSearches.deleted', 'Saved search deleted') }
        : { title: t('savedSearches.deleteFailed', 'Could not delete the search'), variant: 'destructive' },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5" />
          {t('savedSearches.title', 'Saved searches')}
        </CardTitle>
        <CardDescription>
          {t('savedSearches.subtitle', 'Rerun a search any time and get notified when new listings match.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && savedSearches.length === 0 ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : savedSearches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('savedSearches.empty', 'No saved searches yet.')}{' '}
            <button className="text-primary hover:underline" onClick={() => navigate('/discover')}>
              {t('savedSearches.emptyCta', 'Browse listings')}
            </button>
          </p>
        ) : (
          savedSearches.map((search) => (
            <div
              key={search.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{search.name}</p>
                <p className="truncate text-xs text-muted-foreground">{filterSummary(search, t)}</p>
              </div>
              <div className="flex items-center gap-1.5" title={t('savedSearches.notifications', 'Notifications')}>
                <Switch
                  checked={!!search.notifyEnabled}
                  disabled={busyId === search.id}
                  onCheckedChange={(v) => handleToggle(search, v)}
                  aria-label={t('savedSearches.notifications', 'Notifications')}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title={t('savedSearches.run', 'Run search')}
                onClick={() => navigate(`/discover?savedSearch=${search.id}`)}
              >
                <Play className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-500"
                    disabled={busyId === search.id}
                    title={t('savedSearches.delete', 'Delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('savedSearches.delete', 'Delete')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('savedSearches.deleteConfirm', 'Delete "{{name}}"? This cannot be undone.', {
                        name: search.name,
                      })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('savedSearches.cancel', 'Cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(search)}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      {t('savedSearches.delete', 'Delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

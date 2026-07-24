import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/lib/utils';
import useSavedSearchStore from '@/stores/savedSearchStore';

const MAX_PRICE = 10000;
const MAX_SIZE = 200;

/**
 * Build the camelCase POST body from the active /discover filters + search
 * text, sending only non-default values (mirrors how HomeListings appends
 * query params conditionally). `name` is always included.
 */
export function buildSavedSearchBody(name, filters, search) {
  const body = { name };
  if (search) body.search = search;
  if (filters.city) body.city = filters.city;
  if (filters.districts?.length > 0) body.districts = filters.districts;
  if (filters.minPrice > 0) body.minPrice = filters.minPrice;
  if (filters.maxPrice < MAX_PRICE) body.maxPrice = filters.maxPrice;
  if (filters.minSize > 0) body.minSize = filters.minSize;
  if (filters.maxSize < MAX_SIZE) body.maxSize = filters.maxSize;
  if (filters.roomTypes?.length > 0) body.roomTypes = filters.roomTypes;
  if (filters.buildingTypes?.length > 0) body.buildingTypes = filters.buildingTypes;
  if (filters.rentFor?.length > 0) body.rentFor = filters.rentFor;
  if (filters.maxTenants) body.maxTenants = filters.maxTenants;
  if (filters.offeredBy) body.offeredBy = filters.offeredBy;
  return body;
}

/** Suggest a default name from the active city and price range. */
function suggestName(filters, search) {
  const parts = [];
  if (filters.city) parts.push(filters.city);
  else if (search) parts.push(search);
  const hasMin = filters.minPrice > 0;
  const hasMax = filters.maxPrice < MAX_PRICE;
  if (hasMin && hasMax) {
    parts.push(`${formatCurrency(filters.minPrice)}–${formatCurrency(filters.maxPrice)}`);
  } else if (hasMax) {
    parts.push(`≤ ${formatCurrency(filters.maxPrice)}`);
  } else if (hasMin) {
    parts.push(`≥ ${formatCurrency(filters.minPrice)}`);
  }
  return parts.join(' · ');
}

export default function SaveSearchDialog({ open, onOpenChange, filters, search }) {
  const { t } = useTranslation('listings');
  const { toast } = useToast();
  const createSavedSearch = useSavedSearchStore((s) => s.createSavedSearch);

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset the name to a fresh suggestion each time the dialog opens.
  useEffect(() => {
    if (open) setName(suggestName(filters, search));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    const body = buildSavedSearchBody(trimmed, filters, search);
    const result = await createSavedSearch(body);
    setSaving(false);
    if (result.success) {
      toast({ title: t('savedSearches.saved', 'Search saved') });
      onOpenChange(false);
    } else {
      toast({
        title: t('savedSearches.saveFailed', 'Could not save search'),
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Bookmark className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">
            {t('savedSearches.dialogTitle', 'Save this search')}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t(
              'savedSearches.dialogDescription',
              'Name your current filters so you can run them again later.',
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="saved-search-name">
            {t('savedSearches.nameLabel', 'Search name')}
          </Label>
          <Input
            id="saved-search-name"
            value={name}
            maxLength={60}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
            placeholder={t('savedSearches.namePlaceholder', 'e.g. Warsaw under 2500')}
          />
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('savedSearches.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {t('savedSearches.save', 'Save search')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

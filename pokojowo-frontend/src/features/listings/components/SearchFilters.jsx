import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  DollarSign,
  Home,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import SearchFilterChoiceGroup from './SearchFilterChoiceGroup';
import SearchFilterLocation from './SearchFilterLocation';
import SearchFilterRange from './SearchFilterRange';
import SearchFilterTenants from './SearchFilterTenants';
import {
  BUILDING_TYPES,
  MAX_PRICE,
  MAX_SIZE,
  RENT_FOR_OPTIONS,
  ROOM_TYPES,
} from './searchFilterOptions';

const EMPTY_FILTERS = {
  minPrice: 0,
  maxPrice: MAX_PRICE,
  minSize: 0,
  maxSize: MAX_SIZE,
  roomTypes: [],
  buildingTypes: [],
  rentFor: [],
  maxTenants: null,
  city: '',
  districts: [],
  offeredBy: null,
};

export { MAX_PRICE, MAX_SIZE };

export default function SearchFilters({ filters, onFiltersChange, onApply, onReset }) {
  const { t } = useTranslation('listings');
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => setLocalFilters(filters), [filters]);

  const updateFilter = (key, value) => {
    setLocalFilters((previous) => ({ ...previous, [key]: value }));
  };

  const toggleArrayFilter = (key, value) => {
    setLocalFilters((previous) => {
      const currentValues = previous[key] || [];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];
      return { ...previous, [key]: nextValues };
    });
  };

  const activeCount = [
    localFilters.minPrice > 0,
    localFilters.maxPrice < MAX_PRICE,
    localFilters.minSize > 0,
    localFilters.maxSize < MAX_SIZE,
    localFilters.roomTypes?.length > 0,
    localFilters.buildingTypes?.length > 0,
    localFilters.rentFor?.length > 0,
    Boolean(localFilters.maxTenants),
    Boolean(localFilters.city),
    localFilters.districts?.length > 0,
    Boolean(localFilters.offeredBy),
  ].filter(Boolean).length;

  const handleApply = () => {
    onFiltersChange(localFilters);
    onApply?.();
    setIsOpen(false);
  };

  const handleReset = () => {
    const resetFilters = { ...EMPTY_FILTERS };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    onReset?.();
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative min-h-[44px] gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">{t('search.filter', 'Filters')}</span>
          {activeCount > 0 && (
            <Badge className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center bg-primary p-0 text-xs">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-3xl sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-lg sm:rounded-l-xl sm:rounded-t-none"
      >
        <div className="flex justify-center pb-4 pt-2 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
        </div>
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            {t('filters.title', 'Search Filters')}
          </SheetTitle>
          <SheetDescription>
            {t('filters.description', 'Refine your search to find the perfect place')}
          </SheetDescription>
        </SheetHeader>

        <div className="max-h-[calc(85vh-200px)] space-y-6 overflow-y-auto px-1 pb-4 sm:max-h-[calc(90vh-200px)]">
          <SearchFilterLocation
            filters={localFilters}
            setFilters={setLocalFilters}
            toggleArrayFilter={toggleArrayFilter}
          />

          <SearchFilterRange
            type="price"
            filters={localFilters}
            onChange={(range) => setLocalFilters((previous) => ({ ...previous, ...range }))}
            icon={DollarSign}
            iconWrapperClassName="bg-green-100 dark:bg-green-900/30"
            iconClassName="h-4 w-4 text-green-600 dark:text-green-400"
          />
          <SearchFilterRange
            type="size"
            filters={localFilters}
            onChange={(range) => setLocalFilters((previous) => ({ ...previous, ...range }))}
            icon={Home}
            iconWrapperClassName="bg-blue-100 dark:bg-blue-900/30"
            iconClassName="h-4 w-4 text-blue-600 dark:text-blue-400"
          />

          <SearchFilterChoiceGroup
            title={t('filters.roomType', 'Room Type')}
            icon={Home}
            iconWrapperClassName="bg-purple-100 dark:bg-purple-900/30"
            iconClassName="h-4 w-4 text-purple-600 dark:text-purple-400"
            options={ROOM_TYPES}
            selectedValues={localFilters.roomTypes || []}
            onToggle={(value) => toggleArrayFilter('roomTypes', value)}
          />
          <Separator />
          <SearchFilterChoiceGroup
            title={t('filters.buildingType', 'Building Type')}
            icon={Building2}
            iconWrapperClassName="bg-orange-100 dark:bg-orange-900/30"
            iconClassName="h-4 w-4 text-orange-600 dark:text-orange-400"
            options={BUILDING_TYPES}
            selectedValues={localFilters.buildingTypes || []}
            onToggle={(value) => toggleArrayFilter('buildingTypes', value)}
          />
          <Separator />
          <SearchFilterChoiceGroup
            title={t('filters.rentFor', 'Suitable For')}
            icon={Users}
            iconWrapperClassName="bg-pink-100 dark:bg-pink-900/30"
            iconClassName="h-4 w-4 text-pink-600 dark:text-pink-400"
            options={RENT_FOR_OPTIONS}
            selectedValues={localFilters.rentFor || []}
            onToggle={(value) => toggleArrayFilter('rentFor', value)}
          />
          <Separator />
          <SearchFilterChoiceGroup
            title={t('filters.offeredBy', 'Offered by')}
            icon={Building2}
            iconWrapperClassName="bg-amber-100 dark:bg-amber-900/30"
            iconClassName="h-4 w-4 text-amber-600 dark:text-amber-400"
            options={[
              { value: 'owner', label: t('filters.privateOwner', 'Private owner'), icon: '🔑' },
              { value: 'agency', label: t('filters.agency', 'Agency'), icon: '🏢' },
            ]}
            selectedValues={localFilters.offeredBy ? [localFilters.offeredBy] : []}
            onToggle={(value) =>
              updateFilter('offeredBy', localFilters.offeredBy === value ? null : value)
            }
            label={(option) => option.label}
          />
          <Separator />
          <SearchFilterTenants
            value={localFilters.maxTenants}
            onChange={(value) => updateFilter('maxTenants', value === 'any' ? null : parseInt(value, 10))}
          />
        </div>

        <SheetFooter className="sticky bottom-0 mt-4 flex flex-row gap-3 border-t bg-background pb-safe pt-4">
          <Button
            variant="outline"
            onClick={handleReset}
            className="h-12 flex-1 text-base"
            disabled={activeCount === 0}
          >
            <X className="mr-2 h-4 w-4" />
            {t('filters.reset', 'Reset')}
          </Button>
          <Button onClick={handleApply} className="h-12 flex-1 bg-primary text-base hover:bg-primary/90">
            {t('filters.apply', 'Show Results')}
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-2 bg-primary-foreground text-primary">
                {activeCount}
              </Badge>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

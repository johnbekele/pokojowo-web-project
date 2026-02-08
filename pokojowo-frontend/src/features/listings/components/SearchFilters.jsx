import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SlidersHorizontal,
  X,
  Home,
  DollarSign,
  Ruler,
  Users,
  Building2,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const ROOM_TYPES = [
  { value: 'Single', label: 'Single Room', icon: '🛏️' },
  { value: 'Double', label: 'Double Room', icon: '🛏️🛏️' },
  { value: 'Suite', label: 'Suite', icon: '🏠' },
];

const BUILDING_TYPES = [
  { value: 'Apartment', label: 'Apartment', icon: '🏢' },
  { value: 'Loft', label: 'Loft', icon: '🏗️' },
  { value: 'Block', label: 'Block', icon: '🏘️' },
  { value: 'Detached_House', label: 'House', icon: '🏡' },
];

const RENT_FOR_OPTIONS = [
  { value: 'Open to All', label: 'Anyone', icon: '👥' },
  { value: 'Women', label: 'Women', icon: '👩' },
  { value: 'Man', label: 'Men', icon: '👨' },
  { value: 'Student', label: 'Students', icon: '🎓' },
  { value: 'Family', label: 'Families', icon: '👨‍👩‍👧' },
  { value: 'Couple', label: 'Couples', icon: '💑' },
];

const MAX_PRICE = 10000;
const MAX_SIZE = 200;

export default function SearchFilters({ filters, onFiltersChange, onApply, onReset }) {
  const { t } = useTranslation('listings');
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  // Sync local filters when parent filters change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const updateFilter = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const updatePriceRange = (min, max) => {
    setLocalFilters(prev => ({
      ...prev,
      minPrice: min,
      maxPrice: max,
    }));
  };

  const updateSizeRange = (min, max) => {
    setLocalFilters(prev => ({
      ...prev,
      minSize: min,
      maxSize: max,
    }));
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onApply?.();
    setIsOpen(false);
  };

  const handleReset = () => {
    const resetFilters = {
      minPrice: 0,
      maxPrice: MAX_PRICE,
      minSize: 0,
      maxSize: MAX_SIZE,
      roomTypes: [],
      buildingTypes: [],
      rentFor: [],
      maxTenants: null,
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    onReset?.();
  };

  const toggleArrayFilter = (key, value) => {
    setLocalFilters((prev) => {
      const currentValues = prev[key] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      return { ...prev, [key]: newValues };
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.minPrice > 0) count++;
    if (localFilters.maxPrice < MAX_PRICE) count++;
    if (localFilters.minSize > 0) count++;
    if (localFilters.maxSize < MAX_SIZE) count++;
    if (localFilters.roomTypes?.length > 0) count++;
    if (localFilters.buildingTypes?.length > 0) count++;
    if (localFilters.rentFor?.length > 0) count++;
    if (localFilters.maxTenants) count++;
    return count;
  };

  const activeCount = getActiveFilterCount();

  // Toggle chip component for better touch experience
  const FilterChip = ({ selected, onClick, children, icon }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border-2 min-h-[44px]",
        "active:scale-95 touch-manipulation",
        selected
          ? "bg-primary text-primary-foreground border-primary shadow-md"
          : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-accent"
      )}
    >
      {icon && <span className="text-base">{icon}</span>}
      <span>{children}</span>
      {selected && <Check className="h-4 w-4 ml-1" />}
    </button>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 relative min-h-[44px]">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">{t('search.filter', 'Filters')}</span>
          {activeCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="h-[85vh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-t-none sm:rounded-l-xl sm:w-full sm:max-w-lg"
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-2 pb-4 sm:hidden">
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
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

        <div className="overflow-y-auto max-h-[calc(85vh-200px)] sm:max-h-[calc(90vh-200px)] pb-4 space-y-6 px-1">
          {/* Price Range */}
          <div className="space-y-4 bg-muted/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <Label className="font-semibold text-base">{t('filters.price', 'Price Range')}</Label>
              </div>
              <span className="text-sm text-muted-foreground">PLN/month</span>
            </div>

            {/* Price inputs */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">Min</Label>
                <Input
                  type="number"
                  min={0}
                  max={localFilters.maxPrice || MAX_PRICE}
                  value={localFilters.minPrice || 0}
                  onChange={(e) => updatePriceRange(
                    Math.min(Number(e.target.value), localFilters.maxPrice || MAX_PRICE),
                    localFilters.maxPrice || MAX_PRICE
                  )}
                  className="h-12 text-center text-lg font-medium"
                  placeholder="0"
                />
              </div>
              <span className="text-muted-foreground mt-5">—</span>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">Max</Label>
                <Input
                  type="number"
                  min={localFilters.minPrice || 0}
                  max={MAX_PRICE}
                  value={localFilters.maxPrice || MAX_PRICE}
                  onChange={(e) => updatePriceRange(
                    localFilters.minPrice || 0,
                    Math.max(Number(e.target.value), localFilters.minPrice || 0)
                  )}
                  className="h-12 text-center text-lg font-medium"
                  placeholder={MAX_PRICE.toString()}
                />
              </div>
            </div>

            {/* Price slider */}
            <div className="px-2 pt-2">
              <Slider
                min={0}
                max={MAX_PRICE}
                step={100}
                value={[localFilters.minPrice || 0, localFilters.maxPrice || MAX_PRICE]}
                onValueChange={([min, max]) => updatePriceRange(min, max)}
                className="touch-manipulation"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>0 PLN</span>
                <span>{MAX_PRICE.toLocaleString()} PLN</span>
              </div>
            </div>
          </div>

          {/* Size Range */}
          <div className="space-y-4 bg-muted/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Ruler className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <Label className="font-semibold text-base">{t('filters.size', 'Room Size')}</Label>
              </div>
              <span className="text-sm text-muted-foreground">m²</span>
            </div>

            {/* Size inputs */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">Min</Label>
                <Input
                  type="number"
                  min={0}
                  max={localFilters.maxSize || MAX_SIZE}
                  value={localFilters.minSize || 0}
                  onChange={(e) => updateSizeRange(
                    Math.min(Number(e.target.value), localFilters.maxSize || MAX_SIZE),
                    localFilters.maxSize || MAX_SIZE
                  )}
                  className="h-12 text-center text-lg font-medium"
                  placeholder="0"
                />
              </div>
              <span className="text-muted-foreground mt-5">—</span>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">Max</Label>
                <Input
                  type="number"
                  min={localFilters.minSize || 0}
                  max={MAX_SIZE}
                  value={localFilters.maxSize || MAX_SIZE}
                  onChange={(e) => updateSizeRange(
                    localFilters.minSize || 0,
                    Math.max(Number(e.target.value), localFilters.minSize || 0)
                  )}
                  className="h-12 text-center text-lg font-medium"
                  placeholder={MAX_SIZE.toString()}
                />
              </div>
            </div>

            {/* Size slider */}
            <div className="px-2 pt-2">
              <Slider
                min={0}
                max={MAX_SIZE}
                step={5}
                value={[localFilters.minSize || 0, localFilters.maxSize || MAX_SIZE]}
                onValueChange={([min, max]) => updateSizeRange(min, max)}
                className="touch-manipulation"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>0 m²</span>
                <span>{MAX_SIZE} m²</span>
              </div>
            </div>
          </div>

          {/* Room Type */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Home className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <Label className="font-semibold text-base">{t('filters.roomType', 'Room Type')}</Label>
            </div>
            <div className="flex flex-wrap gap-2">
              {ROOM_TYPES.map((type) => (
                <FilterChip
                  key={type.value}
                  selected={localFilters.roomTypes?.includes(type.value)}
                  onClick={() => toggleArrayFilter('roomTypes', type.value)}
                  icon={type.icon}
                >
                  {type.label}
                </FilterChip>
              ))}
            </div>
          </div>

          <Separator />

          {/* Building Type */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Building2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <Label className="font-semibold text-base">{t('filters.buildingType', 'Building Type')}</Label>
            </div>
            <div className="flex flex-wrap gap-2">
              {BUILDING_TYPES.map((type) => (
                <FilterChip
                  key={type.value}
                  selected={localFilters.buildingTypes?.includes(type.value)}
                  onClick={() => toggleArrayFilter('buildingTypes', type.value)}
                  icon={type.icon}
                >
                  {type.label}
                </FilterChip>
              ))}
            </div>
          </div>

          <Separator />

          {/* Rent For */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30">
                <Users className="h-4 w-4 text-pink-600 dark:text-pink-400" />
              </div>
              <Label className="font-semibold text-base">{t('filters.rentFor', 'Suitable For')}</Label>
            </div>
            <div className="flex flex-wrap gap-2">
              {RENT_FOR_OPTIONS.map((option) => (
                <FilterChip
                  key={option.value}
                  selected={localFilters.rentFor?.includes(option.value)}
                  onClick={() => toggleArrayFilter('rentFor', option.value)}
                  icon={option.icon}
                >
                  {option.label}
                </FilterChip>
              ))}
            </div>
          </div>

          <Separator />

          {/* Max Tenants */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                <Users className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
              <Label className="font-semibold text-base">{t('filters.maxTenants', 'Maximum Tenants')}</Label>
            </div>
            <Select
              value={localFilters.maxTenants?.toString() || 'any'}
              onValueChange={(value) => updateFilter('maxTenants', value === 'any' ? null : parseInt(value))}
            >
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder={t('filters.anyTenants', 'Any number')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any" className="h-12">{t('filters.anyTenants', 'Any number')}</SelectItem>
                <SelectItem value="1" className="h-12">1 tenant</SelectItem>
                <SelectItem value="2" className="h-12">2 tenants</SelectItem>
                <SelectItem value="3" className="h-12">3 tenants</SelectItem>
                <SelectItem value="4" className="h-12">4+ tenants</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="flex flex-row gap-3 pt-4 border-t mt-4 sticky bottom-0 bg-background pb-safe">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1 h-12 text-base"
            disabled={activeCount === 0}
          >
            <X className="h-4 w-4 mr-2" />
            {t('filters.reset', 'Reset')}
          </Button>
          <Button
            onClick={handleApply}
            className="flex-1 h-12 text-base bg-primary hover:bg-primary/90"
          >
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

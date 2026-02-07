import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SlidersHorizontal,
  X,
  Home,
  DollarSign,
  Ruler,
  Users,
  Building2,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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

const ROOM_TYPES = [
  { value: 'Single', label: 'Single Room' },
  { value: 'Double', label: 'Double Room' },
  { value: 'Suite', label: 'Suite' },
];

const BUILDING_TYPES = [
  { value: 'Apartment', label: 'Apartment' },
  { value: 'Loft', label: 'Loft' },
  { value: 'Block', label: 'Block' },
  { value: 'Detached_House', label: 'Detached House' },
];

const RENT_FOR_OPTIONS = [
  { value: 'Open to All', label: 'Open to All' },
  { value: 'Women', label: 'Women Only' },
  { value: 'Man', label: 'Men Only' },
  { value: 'Student', label: 'Students' },
  { value: 'Family', label: 'Families' },
  { value: 'Couple', label: 'Couples' },
];

const MAX_PRICE = 10000;
const MAX_SIZE = 200;

export default function SearchFilters({ filters, onFiltersChange, onApply, onReset }) {
  const { t } = useTranslation('listings');
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  const updateFilter = (key, value) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
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

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 relative">
          <SlidersHorizontal className="h-4 w-4" />
          {t('search.filter', 'Filters')}
          {activeCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            {t('filters.title', 'Search Filters')}
          </SheetTitle>
          <SheetDescription>
            {t('filters.description', 'Refine your search to find the perfect place')}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Price Range */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">{t('filters.price', 'Price Range (PLN/month)')}</Label>
            </div>
            <div className="px-2">
              <Slider
                min={0}
                max={MAX_PRICE}
                step={100}
                value={[localFilters.minPrice || 0, localFilters.maxPrice || MAX_PRICE]}
                onValueChange={([min, max]) => {
                  updateFilter('minPrice', min);
                  updateFilter('maxPrice', max);
                }}
                className="mb-2"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{localFilters.minPrice || 0} PLN</span>
                <span>{localFilters.maxPrice || MAX_PRICE} PLN</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Size Range */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">{t('filters.size', 'Size (m²)')}</Label>
            </div>
            <div className="px-2">
              <Slider
                min={0}
                max={MAX_SIZE}
                step={5}
                value={[localFilters.minSize || 0, localFilters.maxSize || MAX_SIZE]}
                onValueChange={([min, max]) => {
                  updateFilter('minSize', min);
                  updateFilter('maxSize', max);
                }}
                className="mb-2"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{localFilters.minSize || 0} m²</span>
                <span>{localFilters.maxSize || MAX_SIZE} m²</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Room Type */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">{t('filters.roomType', 'Room Type')}</Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ROOM_TYPES.map((type) => (
                <div key={type.value} className="flex items-center gap-3 min-h-[44px] py-1">
                  <Checkbox
                    id={`room-${type.value}`}
                    checked={localFilters.roomTypes?.includes(type.value)}
                    onCheckedChange={() => toggleArrayFilter('roomTypes', type.value)}
                  />
                  <label
                    htmlFor={`room-${type.value}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {type.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Building Type */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">{t('filters.buildingType', 'Building Type')}</Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {BUILDING_TYPES.map((type) => (
                <div key={type.value} className="flex items-center gap-3 min-h-[44px] py-1">
                  <Checkbox
                    id={`building-${type.value}`}
                    checked={localFilters.buildingTypes?.includes(type.value)}
                    onCheckedChange={() => toggleArrayFilter('buildingTypes', type.value)}
                  />
                  <label
                    htmlFor={`building-${type.value}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {type.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Rent For */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">{t('filters.rentFor', 'Suitable For')}</Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {RENT_FOR_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center gap-3 min-h-[44px] py-1">
                  <Checkbox
                    id={`rent-${option.value}`}
                    checked={localFilters.rentFor?.includes(option.value)}
                    onCheckedChange={() => toggleArrayFilter('rentFor', option.value)}
                  />
                  <label
                    htmlFor={`rent-${option.value}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Max Tenants */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">{t('filters.maxTenants', 'Maximum Tenants')}</Label>
            </div>
            <Select
              value={localFilters.maxTenants?.toString() || ''}
              onValueChange={(value) => updateFilter('maxTenants', value ? parseInt(value) : null)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('filters.anyTenants', 'Any number')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('filters.anyTenants', 'Any number')}</SelectItem>
                <SelectItem value="1">1 tenant</SelectItem>
                <SelectItem value="2">2 tenants</SelectItem>
                <SelectItem value="3">3 tenants</SelectItem>
                <SelectItem value="4">4+ tenants</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="flex flex-row gap-3 sm:justify-between">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            <X className="h-4 w-4 mr-2" />
            {t('filters.reset', 'Reset All')}
          </Button>
          <Button onClick={handleApply} className="flex-1">
            {t('filters.apply', 'Apply Filters')}
            {activeCount > 0 && ` (${activeCount})`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

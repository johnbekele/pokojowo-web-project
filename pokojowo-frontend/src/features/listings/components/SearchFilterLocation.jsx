import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { CITIES, districtsForCity } from '@/lib/districts';
import FilterChip from './FilterChip';

export default function SearchFilterLocation({ filters, setFilters, toggleArrayFilter }) {
  const { t } = useTranslation('listings');

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
            <MapPin className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <Label className="text-base font-semibold">
            {t('filters.neighbourhood', 'Neighbourhood')}
          </Label>
        </div>
        <Select
          value={filters.city || 'any'}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              city: value === 'any' ? '' : value,
              districts: [],
            }))
          }
        >
          <SelectTrigger className="h-12 text-base">
            <SelectValue placeholder={t('filters.anyCity', 'Any city')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any" className="h-12">
              {t('filters.anyCity', 'Any city')}
            </SelectItem>
            {CITIES.map((city) => (
              <SelectItem key={city} value={city} className="h-12">
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filters.city && (
          <div className="flex flex-wrap gap-2">
            {districtsForCity(filters.city).map((district) => (
              <FilterChip
                key={district}
                selected={filters.districts?.includes(district)}
                onClick={() => toggleArrayFilter('districts', district)}
              >
                {district}
              </FilterChip>
            ))}
          </div>
        )}
      </div>
      <Separator />
    </>
  );
}

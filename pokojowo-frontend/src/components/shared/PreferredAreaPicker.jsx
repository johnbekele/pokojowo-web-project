import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CITIES, districtsForCity } from '@/lib/districts';
import { cn } from '@/lib/utils';

const OTHER = '__other__';

function DistrictChip({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border-2 min-h-[44px]',
        'active:scale-95 touch-manipulation',
        selected
          ? 'bg-primary text-primary-foreground border-primary shadow-md'
          : 'bg-background text-foreground border-border hover:border-primary/50 hover:bg-accent'
      )}
    >
      <span>{children}</span>
      {selected && <Check className="h-4 w-4 ml-1" />}
    </button>
  );
}

/**
 * Where a tenant wants to live. Picking a city and districts (rather than
 * typing free text) is what lets us place them on the flatmate map — a
 * whole-city guess would stack every Warsaw tenant on one pin.
 *
 * Free text typed before this picker existed still loads: an unrecognised
 * city falls back to the text field rather than being dropped.
 */
export default function PreferredAreaPicker({ city, districts = [], onChange }) {
  const { t } = useTranslation('profile');
  const isKnownCity = CITIES.includes(city);
  const [useOther, setUseOther] = useState(!!city && !isKnownCity);

  const selectValue = useOther ? OTHER : isKnownCity ? city : '';

  const handleCityChange = (value) => {
    if (value === OTHER) {
      setUseOther(true);
      onChange({ city: isKnownCity ? '' : city, districts: [] });
      return;
    }
    setUseOther(false);
    // Districts belong to a city; carrying them over would claim the tenant
    // wants a Warsaw district in Kraków.
    onChange({ city: value, districts: [] });
  };

  const toggleDistrict = (district) => {
    const next = districts.includes(district)
      ? districts.filter((d) => d !== district)
      : [...districts, district];
    onChange({ city, districts: next });
  };

  const available = districtsForCity(city);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {t('preferences.location', 'Where do you want to live?')}
        </Label>
        <Select value={selectValue} onValueChange={handleCityChange}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder={t('preferences.selectCity', 'Select a city')} />
          </SelectTrigger>
          <SelectContent>
            {CITIES.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
            <SelectItem value={OTHER}>
              {t('preferences.otherCity', 'Somewhere else')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {useOther && (
        <Input
          value={city}
          onChange={(e) => onChange({ city: e.target.value, districts: [] })}
          placeholder={t('preferences.otherCityPlaceholder', 'e.g., Katowice')}
          className="h-11"
        />
      )}

      {available.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {t('preferences.districts', 'Preferred areas')}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t(
              'preferences.districtsHint',
              'Optional. Picking areas puts you on the map for flatmates searching there.'
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {available.map((district) => (
              <DistrictChip
                key={district}
                selected={districts.includes(district)}
                onClick={() => toggleDistrict(district)}
              >
                {district}
              </DistrictChip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

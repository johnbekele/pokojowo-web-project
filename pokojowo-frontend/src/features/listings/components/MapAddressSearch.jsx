import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Crosshair, Loader2, Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { geocodeAddress } from '@/services/geocoding';

const FOCUS_ZOOM = 14;

/**
 * "Show me what's near here" — type an address (your office, a university) and
 * the map flies to it. Geocoding runs on submit only, never per keystroke, to
 * stay inside Nominatim's 1 request/second policy.
 */
export default function MapAddressSearch({ onFocusLocation, className }) {
  const { t } = useTranslation('listings');
  const { toast } = useToast();
  const [value, setValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const query = value.trim();
    if (!query || isSearching) return;

    setIsSearching(true);
    try {
      const result = await geocodeAddress({ address: query });
      if (!result) {
        toast({
          title: t('map.addressNotFound', "Couldn't find that address"),
          description: t('map.addressNotFoundHint', 'Try adding the city, e.g. "Plac Bankowy, Warszawa".'),
        });
        return;
      }
      onFocusLocation({ lat: result.latitude, lng: result.longitude, zoom: FOCUS_ZOOM });
    } catch {
      toast({
        title: t('map.addressLookupFailed', 'Address lookup failed'),
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: t('map.locationUnsupported', 'Your browser cannot share your location'),
        variant: 'destructive',
      });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        onFocusLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          zoom: FOCUS_ZOOM,
        });
      },
      () => {
        setIsLocating(false);
        toast({
          title: t('map.locationDenied', 'Location permission denied'),
          variant: 'destructive',
        });
      },
      { timeout: 10000 },
    );
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/95 p-1 shadow-md backdrop-blur">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t('map.searchNear', 'Search near an address…')}
            className="h-9 border-none bg-transparent pl-9 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <Button type="submit" size="sm" className="h-8 rounded-full px-3" disabled={isSearching}>
          {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('map.go', 'Go')}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full"
          onClick={handleUseMyLocation}
          disabled={isLocating}
          title={t('map.useMyLocation', 'Use my location')}
        >
          {isLocating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Crosshair className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
}

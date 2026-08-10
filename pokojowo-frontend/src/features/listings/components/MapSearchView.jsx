import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Loader2, MapPin, Users } from 'lucide-react';

import { formatCurrency, cn } from '@/lib/utils';
import useAuthStore from '@/stores/authStore';
import {
  useFlatmateMapPins,
  useListingMapPins,
  useListingsInArea,
} from '@/hooks/useMapPins';
import MapAddressSearch from './MapAddressSearch';
import MapLayerToggle, { MAP_LAYERS } from './MapLayerToggle';
import SearchMap from './SearchMap';

const FALLBACK_LISTING_IMAGE = '/images/promo/modern-room.avif';

/**
 * Map mode for /discover: the visible area drives both the pins and the list
 * beside them, so panning to an office neighbourhood answers "what can I rent
 * near here?". The flatmate layer answers the other half — who else wants to
 * live here.
 */
export default function MapSearchView({ search, sort, filters }) {
  const { t } = useTranslation('listings');
  const { user } = useAuthStore();

  const [viewport, setViewport] = useState({ bbox: null, zoom: null });
  const [layer, setLayer] = useState(MAP_LAYERS.FLATS);
  const [focus, setFocus] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  const showListings = layer !== MAP_LAYERS.FLATMATES;
  const showFlatmates = layer !== MAP_LAYERS.FLATS;
  // The endpoint rejects incomplete profiles, so don't ask on their behalf.
  const canSeeFlatmates = !!user?.isProfileComplete;

  const { data: listingData, isFetching: isFetchingPins } = useListingMapPins({
    bbox: viewport.bbox,
    zoom: viewport.zoom,
    search,
    filters,
    enabled: showListings,
  });

  const { data: flatmateData } = useFlatmateMapPins({
    bbox: viewport.bbox,
    enabled: showFlatmates && canSeeFlatmates,
  });

  // The side list shows full listings for the same area, so a user can read
  // details without hunting for the right pin.
  const { data: areaListings } = useListingsInArea({
    bbox: viewport.bbox,
    search,
    sort,
    filters,
    enabled: showListings,
  });

  const summary = useMemo(() => {
    if (!showListings) {
      return t('map.flatmateCount', {
        count: flatmateData.pins.length,
        defaultValue: '{{count}} flatmates looking here',
      });
    }
    if (listingData.mode === 'clusters') {
      return t('map.zoomForPins', 'Zoom in to see individual rooms');
    }
    return t('map.listingCount', {
      count: listingData.total,
      defaultValue: '{{count}} rooms in view',
    });
  }, [showListings, listingData, flatmateData, t]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      {/* Results for the visible area */}
      <div className="order-2 space-y-3 lg:order-1 lg:max-h-[70vh] lg:overflow-y-auto lg:pr-1">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <span>{summary}</span>
          {isFetchingPins && <Loader2 className="h-3 w-3 animate-spin" />}
        </div>

        {showListings &&
          areaListings.map((listing) => {
            const id = listing._id || listing.id;
            return (
              <Link
                key={id}
                to={`/listing/${id}`}
                onMouseEnter={() => setHoveredId(id)}
                onMouseLeave={() => setHoveredId(null)}
                className={cn(
                  'flex gap-3 rounded-xl border p-2 transition-colors',
                  hoveredId === id
                    ? 'border-foreground/40 bg-accent/40'
                    : 'border-border/60 bg-card hover:border-foreground/20',
                )}
              >
                <img
                  src={listing.images?.[0] || FALLBACK_LISTING_IMAGE}
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_LISTING_IMAGE;
                  }}
                  alt={t('accessibility.listingPhoto', {
                    title: [listing.district, listing.city].filter(Boolean).join(', ') || listing.address,
                    defaultValue: 'Listing photo for {{title}}',
                  })}
                  className="h-20 w-24 flex-shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1 space-y-1 py-0.5">
                  <p className="font-display text-lg font-medium leading-none text-foreground">
                    {formatCurrency(listing.price)}
                    <span className="ml-1 text-xs text-muted-foreground">
                      / {t('card.month', 'mo')}
                    </span>
                  </p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {[listing.district, listing.city].filter(Boolean).join(', ') ||
                        listing.address}
                    </span>
                  </p>
                  <p className="flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    {listing.size ? (
                      <span className="inline-flex items-center gap-1">
                        <Home className="h-3 w-3" /> {listing.size} m²
                      </span>
                    ) : null}
                    {listing.maxTenants ? (
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" /> {listing.maxTenants}
                      </span>
                    ) : null}
                  </p>
                </div>
              </Link>
            );
          })}

        {showListings && areaListings.length === 0 && (
          <p className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
            {t('map.emptyArea', 'No rooms in this area yet — try panning or zooming out.')}
          </p>
        )}
      </div>

      {/* Map */}
      <div className="relative order-1 h-[55vh] overflow-hidden rounded-2xl border border-border/70 shadow-editorial lg:order-2 lg:h-[70vh] lg:sticky lg:top-24">
        <SearchMap
          className="h-full w-full"
          listingData={listingData}
          flatmatePins={showFlatmates && canSeeFlatmates ? flatmateData.pins : []}
          showListings={showListings}
          showFlatmates={showFlatmates && canSeeFlatmates}
          onViewportChange={setViewport}
          focus={focus}
          hoveredListingId={hoveredId}
          onHoverListing={setHoveredId}
        />

        {/* Controls float over the map; z-index clears Leaflet's panes (400). */}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex flex-col gap-2">
          <div className="pointer-events-auto">
            <MapAddressSearch onFocusLocation={setFocus} />
          </div>
          <div className="pointer-events-auto">
            <MapLayerToggle value={layer} onChange={setLayer} />
          </div>
          {showFlatmates && !canSeeFlatmates && (
            <p className="pointer-events-auto rounded-xl bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-md backdrop-blur">
              {t(
                'map.flatmatesNeedProfile',
                'Complete your tenant profile to see who else is looking here.',
              )}
            </p>
          )}
          {showFlatmates &&
            canSeeFlatmates &&
            flatmateData.pins.length === 0 &&
            flatmateData.totalWithArea === 0 && (
              <p className="pointer-events-auto rounded-xl bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-md backdrop-blur">
                {t(
                  'map.noFlatmateAreas',
                  "None of your matches have shared the area they're looking in yet.",
                )}
              </p>
            )}
        </div>

        {listingData.truncated && showListings && (
          <p className="absolute inset-x-3 bottom-8 z-[500] rounded-xl bg-background/95 px-3 py-2 text-center text-xs text-muted-foreground shadow-md backdrop-blur">
            {t('map.truncated', 'Showing some of the rooms here — zoom in for the rest.')}
          </p>
        )}
      </div>
    </div>
  );
}

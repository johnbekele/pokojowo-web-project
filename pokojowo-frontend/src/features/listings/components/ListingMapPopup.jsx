import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Home, MapPin } from 'lucide-react';

import { formatCurrency } from '@/lib/utils';

const FALLBACK_LISTING_IMAGE = '/images/promo/modern-room.avif';

/** Preview card inside a map pin's popup, linking through to the listing. */
export default function ListingMapPopup({ pin }) {
  const { t } = useTranslation('listings');
  const place = [pin.district, pin.city].filter(Boolean).join(', ') || pin.address;

  return (
    <Link to={`/listing/${pin.id}`} className="group block w-52 no-underline">
      <img
        src={pin.image || FALLBACK_LISTING_IMAGE}
        onError={(e) => {
          e.currentTarget.src = FALLBACK_LISTING_IMAGE;
        }}
        alt={t('accessibility.listingPhoto', {
          title: place,
          defaultValue: 'Listing photo for {{title}}',
        })}
        className="h-28 w-full rounded-lg object-cover"
      />
      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-lg font-medium leading-none text-foreground">
            {formatCurrency(pin.price)}
            <span className="ml-1 text-xs text-muted-foreground">
              / {t('card.month', 'mo')}
            </span>
          </span>
          <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>
        {place && (
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{place}</span>
          </p>
        )}
        <p className="flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {pin.size ? (
            <span className="inline-flex items-center gap-1">
              <Home className="h-3 w-3" /> {pin.size} m²
            </span>
          ) : null}
          {pin.roomType ? <span>{pin.roomType}</span> : null}
        </p>
      </div>
    </Link>
  );
}

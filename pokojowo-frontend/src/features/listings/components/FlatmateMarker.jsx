import { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { formatCurrency } from '@/lib/utils';
import { flatmateIcon } from './mapIcons';

/**
 * A flatmate looking for a place in this area. The pin marks the area they
 * *want* to live in, not where they live — so the popup says so, and never
 * shows an address.
 */
export default function FlatmateMarker({ pin }) {
  const { t } = useTranslation('matching');

  const icon = useMemo(
    () =>
      flatmateIcon({
        photo: pin.photo,
        score: pin.score,
        initial: pin.firstname?.[0]?.toUpperCase(),
      }),
    [pin.photo, pin.score, pin.firstname],
  );

  const area =
    pin.preferredDistricts?.length > 0
      ? pin.preferredDistricts.join(', ')
      : pin.preferredLocation;

  return (
    <Marker position={[pin.lat, pin.lng]} icon={icon}>
      <Popup closeButton={false} minWidth={200} maxWidth={220}>
        <Link to={`/matches/${pin.userId}`} className="block w-48 no-underline">
          <p className="font-display text-base font-medium text-foreground">
            {pin.firstname || t('map.someone', 'A flatmate')}
            {pin.age ? <span className="text-muted-foreground">, {pin.age}</span> : null}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-accent">
            {t('map.compatibility', '{{score}}% match', { score: Math.round(pin.score) })}
          </p>
          {area && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t('map.wantsToLiveIn', 'Looking in {{area}}', { area })}
            </p>
          )}
          {pin.budget?.max ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {t('map.budget', 'Budget up to {{amount}}', {
                amount: formatCurrency(pin.budget.max),
              })}
            </p>
          ) : null}
        </Link>
      </Popup>
    </Marker>
  );
}

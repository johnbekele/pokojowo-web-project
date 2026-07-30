import { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';

import ListingMapPopup from './ListingMapPopup';
import { priceIcon } from './mapIcons';

/**
 * A flat on the map, shown as its monthly price. Clicking opens a preview that
 * links to the listing; hovering syncs with the results list beside the map.
 */
export default function ListingPriceMarker({ pin, active, onHover }) {
  // Rebuilding the icon on every render would make Leaflet replace the DOM
  // node and drop the open popup, so only rebuild when the look changes.
  const icon = useMemo(() => priceIcon(pin.price, { active }), [pin.price, active]);

  return (
    <Marker
      position={[pin.lat, pin.lng]}
      icon={icon}
      // Active markers must sit above their neighbours to stay clickable.
      zIndexOffset={active ? 1000 : 0}
      eventHandlers={{
        mouseover: () => onHover?.(pin.id),
        mouseout: () => onHover?.(null),
      }}
    >
      <Popup closeButton={false} minWidth={208} maxWidth={208}>
        <ListingMapPopup pin={pin} />
      </Popup>
    </Marker>
  );
}

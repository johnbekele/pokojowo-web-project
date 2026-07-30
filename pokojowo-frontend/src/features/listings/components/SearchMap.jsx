import { useEffect, useRef } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

import { OSM_ATTRIBUTION, OSM_TILE_URL } from '@/lib/leaflet';
import { boundsToBbox } from '@/lib/listingQuery';
import FlatmateMarker from './FlatmateMarker';
import ListingPriceMarker from './ListingPriceMarker';
import { clusterIcon } from './mapIcons';

// Centre of Poland, wide enough to see the major cities before the user moves.
const DEFAULT_CENTER = [52.0693, 19.4803];
const DEFAULT_ZOOM = 6;
const VIEW_DEBOUNCE_MS = 400;

/** Reports the visible area upward, debounced so a drag is one request. */
function ViewportReporter({ onViewportChange }) {
  const map = useMap();
  const timer = useRef(null);

  const report = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onViewportChange({ bbox: boundsToBbox(map.getBounds()), zoom: map.getZoom() });
    }, VIEW_DEBOUNCE_MS);
  };

  useMapEvents({ moveend: report, zoomend: report });

  // Fire once on mount: without this nothing loads until the user touches the map.
  useEffect(() => {
    onViewportChange({ bbox: boundsToBbox(map.getBounds()), zoom: map.getZoom() });
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

/** Flies to a location chosen through the address search or "use my location". */
function FocusHandler({ focus }) {
  const map = useMap();

  useEffect(() => {
    if (!focus) return;
    map.flyTo([focus.lat, focus.lng], focus.zoom ?? map.getZoom(), { duration: 0.8 });
  }, [focus, map]);

  return null;
}

/** Zooming in on a cluster is how you break it apart into pins. */
function ClusterMarker({ cluster }) {
  const map = useMap();
  return (
    <Marker
      position={[cluster.lat, cluster.lng]}
      icon={clusterIcon(cluster.count)}
      eventHandlers={{
        click: () => map.flyTo([cluster.lat, cluster.lng], Math.min(map.getZoom() + 3, 17)),
      }}
    />
  );
}

/**
 * The map behind /discover?view=map. Pins are computed server-side: individual
 * price bubbles when zoomed in, counted clusters when zoomed out, so both web
 * and mobile show the same thing without a clustering library.
 */
export default function SearchMap({
  listingData,
  flatmatePins = [],
  showListings = true,
  showFlatmates = false,
  onViewportChange,
  focus,
  hoveredListingId,
  onHoverListing,
  className = '',
}) {
  const isClustered = listingData?.mode === 'clusters';

  return (
    <div className={className}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
        <ViewportReporter onViewportChange={onViewportChange} />
        <FocusHandler focus={focus} />

        {showListings &&
          isClustered &&
          listingData.clusters.map((cluster) => (
            <ClusterMarker key={cluster.id} cluster={cluster} />
          ))}

        {showListings &&
          !isClustered &&
          listingData.pins.map((pin) => (
            <ListingPriceMarker
              key={pin.id}
              pin={pin}
              active={hoveredListingId === pin.id}
              onHover={onHoverListing}
            />
          ))}

        {showFlatmates &&
          flatmatePins.map((pin) => <FlatmateMarker key={pin.userId} pin={pin} />)}
      </MapContainer>
    </div>
  );
}

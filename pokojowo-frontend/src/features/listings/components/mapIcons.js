import L from '@/lib/leaflet';

// Leaflet divIcons take an HTML string, not React, so anything interpolated
// here must be escaped. Prices and counts are numbers, but image URLs and
// names come from user data.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** "2 500 zł" -> a compact "2.5k" that fits in a map bubble. */
function shortPrice(price) {
  const value = Number(price);
  if (!Number.isFinite(value)) return '—';
  if (value >= 1000) {
    const thousands = value / 1000;
    const formatted = thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1).replace(/\.0$/, '');
    return `${formatted}k`;
  }
  return String(Math.round(value));
}

function shortCount(count) {
  if (count >= 1000) return `${Math.floor(count / 1000)}K+`;
  return String(count);
}

export function priceIcon(price, { active = false } = {}) {
  const classes = active
    ? 'bg-foreground text-background border-foreground'
    : 'bg-background text-foreground border-border';
  return L.divIcon({
    className: 'pokojowo-price-marker',
    html: `<span class="inline-flex items-center rounded-full border-2 px-2.5 py-1 text-xs font-semibold shadow-md whitespace-nowrap ${classes}">${escapeHtml(
      shortPrice(price),
    )}</span>`,
    // Anchor at the bottom centre so the bubble sits above the location.
    iconSize: [56, 26],
    iconAnchor: [28, 26],
    popupAnchor: [0, -26],
  });
}

export function clusterIcon(count) {
  // Bigger areas get bigger bubbles, capped so a hot city doesn't cover a region.
  const size = count >= 1000 ? 56 : count >= 100 ? 48 : 40;
  return L.divIcon({
    className: 'pokojowo-cluster-marker',
    html: `<span class="flex items-center justify-center rounded-full border-2 border-background bg-foreground text-background font-semibold shadow-lg" style="width:${size}px;height:${size}px;font-size:${
      count >= 1000 ? 12 : 13
    }px">${escapeHtml(shortCount(count))}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function flatmateIcon({ photo, score, initial }) {
  const inner = photo
    ? `<img src="${escapeHtml(photo)}" alt="" class="h-full w-full rounded-full object-cover" />`
    : `<span class="flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">${escapeHtml(
        initial || '?',
      )}</span>`;

  return L.divIcon({
    className: 'pokojowo-flatmate-marker',
    html: `
      <span class="relative block h-11 w-11 rounded-full border-[3px] border-accent bg-background shadow-md">
        ${inner}
        <span class="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-accent px-1.5 text-[10px] font-bold leading-4 text-accent-foreground">${escapeHtml(
          Math.round(score ?? 0),
        )}%</span>
      </span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

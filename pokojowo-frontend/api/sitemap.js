/* global process */

const SUPPORTED_LANGUAGES = ['en', 'pl'];
const SITE_URL = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://pokojowo.com').replace(/\/$/, '');
const DEFAULT_BACKEND = 'https://dh3iw703m1vvi.cloudfront.net/api';
const PAGE_SIZE = 100;
const MAX_LISTINGS = 10_000;

const escapeXml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const localizedUrl = (pathname, language) => {
  const url = new URL(pathname, SITE_URL);
  url.searchParams.set('lang', language);
  return url.toString();
};

const listingApiBase = () => {
  // Keep the sitemap independent from the browser bundle's API setting. The
  // web app still has a legacy Render value in VITE_API_BASE_URL, while the
  // live listing data is served through the CloudFront distribution.
  const configured = process.env.SITEMAP_API_URL || DEFAULT_BACKEND;
  const base = configured.replace(/\/$/, '');
  return base.endsWith('/api') ? base : `${base}/api`;
};

const fetchWithTimeout = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Listing API returned ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
};

async function getCurrentListingPaths() {
  const listings = [];
  const apiBase = listingApiBase();

  for (let skip = 0; skip < MAX_LISTINGS; skip += PAGE_SIZE) {
    const url = `${apiBase}/listings/?limit=${PAGE_SIZE}&skip=${skip}&sort=newest`;
    const page = await fetchWithTimeout(url);
    const pageListings = Array.isArray(page) ? page : page?.listings || [];
    listings.push(...pageListings);
    if (pageListings.length < PAGE_SIZE) break;
  }

  return listings
    .filter((listing) => listing && listing.isActive !== false && listing.sourceStatus !== 'unpublished')
    .map((listing) => ({
      pathname: `/listing/${encodeURIComponent(String(listing._id || listing.id))}`,
      lastmod: listing.updatedAt || listing.createdAt,
    }))
    .filter((listing) => !listing.pathname.endsWith('/undefined'));
}

const alternateLinks = (pathname) => SUPPORTED_LANGUAGES
  .map((language) => `\n    <xhtml:link rel="alternate" hreflang="${language}" href="${escapeXml(localizedUrl(pathname, language))}" />`)
  .join('');

const renderUrl = ({ pathname, changefreq, priority, lastmod }) => {
  const entries = SUPPORTED_LANGUAGES.map((language) => `
  <url>
    <loc>${escapeXml(localizedUrl(pathname, language))}</loc>${lastmod ? `
    <lastmod>${escapeXml(new Date(lastmod).toISOString())}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${alternateLinks(pathname)}
  </url>`);
  return entries.join('');
};

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).send('Method Not Allowed');
    return;
  }

  const urls = [
    renderUrl({ pathname: '/', changefreq: 'weekly', priority: '1.0' }),
    renderUrl({ pathname: '/discover', changefreq: 'daily', priority: '0.9' }),
  ];

  try {
    const listingPaths = await getCurrentListingPaths();
    listingPaths.forEach((listing) => {
      urls.push(renderUrl({
        ...listing,
        changefreq: 'daily',
        priority: '0.8',
      }));
    });
  } catch (error) {
    // Keep the sitemap useful during a backend deploy or brief outage. The
    // next cached refresh will pick up listing URLs once the API responds.
    console.error('Unable to load listings for sitemap:', error);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}
</urlset>`;

  response.setHeader('Content-Type', 'application/xml; charset=utf-8');
  response.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
  response.status(200).send(xml);
}

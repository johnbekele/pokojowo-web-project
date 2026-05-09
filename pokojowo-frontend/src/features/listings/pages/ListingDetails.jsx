import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  MapPin,
  Calendar,
  MessageSquare,
  ArrowLeft,
  Check,
  Home,
  Bed,
  Users,
  Phone,
  ExternalLink,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import UserAvatar from '@/components/shared/UserAvatar';
import {
  Eyebrow,
  DisplayTitle,
  EditorialRule,
  LuxuryPanel,
  MediaFrame,
  TrustBadge,
} from '@/components/shared/editorial';
import ListingLikeButton from '../components/ListingLikeButton';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

const IMAGE_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';

const getTranslatedText = (text, lang) => {
  if (!text) return '';
  if (typeof text === 'string') return text;
  if (typeof text === 'object') return text[lang] || text.en || text.pl || '';
  return String(text);
};

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/images/')) return url;
  return `${IMAGE_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function ListingDetails() {
  const { id } = useParams();
  const { t, i18n } = useTranslation('listings');
  const currentLang = i18n.language?.split('-')[0] || 'en';

  const { data: listing, isLoading, error } = useQuery({
    queryKey: ['listing', id],
    queryFn: async () => {
      const response = await api.get(`/listings/${id}`);
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-10">
        <Skeleton className="h-6 w-40" />
        <div className="grid gap-3 md:grid-cols-3 md:grid-rows-2 md:h-[28rem]">
          <Skeleton className="md:col-span-2 md:row-span-2 h-72 md:h-full rounded-[1.75rem]" />
          <Skeleton className="h-44 rounded-[1.5rem]" />
          <Skeleton className="h-44 rounded-[1.5rem]" />
        </div>
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <LuxuryPanel className="text-center py-16" tone="parchment">
        <Eyebrow>{t('detail.notFoundEyebrow', 'Listing missing')}</Eyebrow>
        <h2 className="mt-3 font-display text-3xl font-medium text-foreground">
          {t('detail.notFound', 'This page is between issues')}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          {t('detail.notFoundDescription', "This listing may have been removed or doesn't exist.")}
        </p>
        <Link to="/" className="mt-6 inline-block">
          <Button variant="default">
            <ArrowLeft className="h-4 w-4" />
            {t('detail.backToListings', 'Back to listings')}
          </Button>
        </Link>
      </LuxuryPanel>
    );
  }

  const landlord = listing.landlord || listing.owner;
  const images = (listing.images || []).map(getImageUrl).filter(Boolean);
  const phoneNumber = listing.phone || landlord?.phone;
  const isScraped = listing.isScraped;
  const sourceUrl = listing.sourceUrl;
  const sourceSite = listing.sourceSite;

  const description = getTranslatedText(listing.description, currentLang);
  const title = getTranslatedText(listing.title, currentLang) || listing.address;
  const heroImage = images[0];
  const sideImages = images.slice(1, 5);

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-eyebrow text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('detail.backToListings', 'Back to listings')}
        </Link>
        <div className="flex items-center gap-2">
          {listing.available && (
            <TrustBadge tone="olive" icon={Check}>
              {t('detail.availableNow', 'Available')}
            </TrustBadge>
          )}
          {isScraped ? (
            <TrustBadge tone="ink">
              {t('detail.imported', 'Imported listing')}
            </TrustBadge>
          ) : (
            <TrustBadge tone="accent" icon={ShieldCheck}>
              {t('detail.curated', 'Curated by Pokojowo')}
            </TrustBadge>
          )}
        </div>
      </div>

      {/* ─── EDITORIAL HEADER ─────────────────────────────────────────── */}
      <header className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="space-y-4">
          <Eyebrow>
            № {String(id).slice(-4).toUpperCase()} · {listing.buildingType || t('detail.listing', 'Listing')}
          </Eyebrow>
          <DisplayTitle size="md" as="h1">
            {title}
          </DisplayTitle>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {typeof listing.address === 'string'
                ? listing.address
                : `${listing.address?.street || ''}, ${listing.address?.city || ''}`}
            </span>
            {listing.size && (
              <span className="inline-flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5" /> {listing.size} m²
              </span>
            )}
            {listing.roomType && (
              <span className="inline-flex items-center gap-1.5">
                <Bed className="h-3.5 w-3.5" /> <span className="capitalize">{listing.roomType.replace('_', ' ')}</span>
              </span>
            )}
            {listing.maxTenants && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {t('detail.maxTenants', 'Max {{count}} tenants', { count: listing.maxTenants })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-end gap-4">
          <div>
            <p className="text-eyebrow">{t('card.perMonth', 'per month')}</p>
            <p className="mt-1 font-display text-display-sm font-medium leading-none tracking-editorial text-foreground">
              {formatCurrency(listing.price || listing.rent)}
            </p>
          </div>
          <ListingLikeButton listingId={id} size="large" />
        </div>
      </header>

      {/* ─── EDITORIAL GALLERY ────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {heroImage ? (
          <div className="grid gap-3 md:grid-cols-3 md:grid-rows-2 md:h-[34rem]">
            <MediaFrame
              src={heroImage}
              alt={title}
              rounded="rounded-[1.75rem]"
              className="md:col-span-2 md:row-span-2 h-72 md:h-full"
            />
            {sideImages.length > 0
              ? sideImages.map((src, idx) => (
                  <MediaFrame
                    key={idx}
                    src={src}
                    alt={`${title} ${idx + 2}`}
                    rounded="rounded-[1.5rem]"
                    className="h-44 md:h-full"
                  />
                ))
              : Array.from({ length: 2 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-44 md:h-full rounded-[1.5rem] bg-surface-parchment border border-border/60 flex items-center justify-center"
                  >
                    <Home className="h-10 w-10 text-muted-foreground/60" />
                  </div>
                ))}
          </div>
        ) : (
          <div className="flex h-80 items-center justify-center rounded-[1.75rem] bg-surface-parchment border border-border/60">
            <Home className="h-16 w-16 text-muted-foreground/50" />
          </div>
        )}
      </motion.section>

      {/* ─── DETAILS / SIDEBAR ────────────────────────────────────────── */}
      <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-12">
          <section className="space-y-5">
            <Eyebrow>{t('details.descriptionEyebrow', 'About this room')}</Eyebrow>
            <p className="font-display text-2xl font-light leading-relaxed tracking-editorial text-foreground/90">
              {description ? description.split(/\n\n+/)[0] : t('detail.noDescription', 'A quiet, comfortable room awaiting its next tenant.')}
            </p>
            {description && description.split(/\n\n+/).slice(1).map((para, i) => (
              <p key={i} className="text-base leading-relaxed text-muted-foreground whitespace-pre-line">
                {para}
              </p>
            ))}
          </section>

          <EditorialRule label={t('details.factsEyebrow', 'The Facts')} />

          <section className="grid gap-5 sm:grid-cols-2">
            {listing.size && (
              <FactRow label={t('details.size', 'Size')} value={`${listing.size} m²`} icon={Home} />
            )}
            {listing.roomType && (
              <FactRow label={t('details.roomType', 'Room')} value={String(listing.roomType).replace('_', ' ')} icon={Bed} />
            )}
            {listing.buildingType && (
              <FactRow label={t('details.buildingType', 'Building')} value={String(listing.buildingType).replace('_', ' ')} icon={Home} />
            )}
            {listing.maxTenants && (
              <FactRow
                label={t('details.maxTenants', 'Max tenants')}
                value={listing.maxTenants}
                icon={Users}
              />
            )}
            {listing.availableFrom && (
              <FactRow
                label={t('details.availableFromLabel', 'Available from')}
                value={formatDate(listing.availableFrom)}
                icon={Calendar}
              />
            )}
            {listing.deposit && (
              <FactRow
                label={t('details.deposit', 'Deposit')}
                value={formatCurrency(listing.deposit)}
                icon={ShieldCheck}
              />
            )}
          </section>

          {listing.amenities?.length > 0 && (
            <>
              <EditorialRule label={t('details.amenitiesEyebrow', 'Amenities')} />
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
                {listing.amenities.map((amenity) => (
                  <div key={amenity} className="flex items-center gap-2 text-sm text-foreground">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-olive/10 text-olive">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="capitalize">{amenity.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {listing.closeTo?.length > 0 && (
            <>
              <EditorialRule label={t('details.nearbyEyebrow', 'In the neighbourhood')} />
              <div className="flex flex-wrap gap-2">
                {listing.closeTo.map((spot) => (
                  <Badge key={spot} variant="secondary">
                    <MapPin className="h-3 w-3" />
                    {spot}
                  </Badge>
                ))}
              </div>
            </>
          )}

          {listing.rentForOnly?.length > 0 && (
            <>
              <EditorialRule label={t('details.suitedEyebrow', 'Best suited for')} />
              <div className="flex flex-wrap gap-2">
                {listing.rentForOnly.map((rentFor) => (
                  <Badge key={rentFor} variant="accent">
                    {String(rentFor)}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sticky concierge panel */}
        <aside className="space-y-4 lg:sticky lg:top-32 self-start">
          {isScraped && (
            <Alert className="border-warning/40 bg-warning/10">
              <AlertCircle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-foreground">
                {t(
                  'detail.scrapedNotice',
                  'This listing was imported from an external source. Contact the host directly through the original website or phone number.',
                )}
              </AlertDescription>
            </Alert>
          )}

          <LuxuryPanel className="space-y-6 p-0 overflow-hidden">
            <div className="bg-surface-ink p-6 text-[hsl(var(--surface-paper))]">
              <p className="text-eyebrow text-[hsl(var(--surface-paper)/0.7)]">
                {t('detail.priceEyebrow', 'Monthly rent')}
              </p>
              <p className="mt-2 font-display text-4xl font-medium leading-none tracking-editorial">
                {formatCurrency(listing.price || listing.rent)}
              </p>
              <p className="mt-2 text-xs text-[hsl(var(--surface-paper)/0.6)]">
                {listing.utilitiesIncluded
                  ? t('details.utilitiesIncluded', 'Utilities included')
                  : t('details.utilitiesExtra', 'Utilities billed separately')}
              </p>
            </div>

            <div className="space-y-5 p-6">
              {!isScraped && landlord ? (
                <div className="space-y-4">
                  <Eyebrow>{t('details.landlord', 'Your host')}</Eyebrow>
                  <div className="flex items-center gap-3">
                    <UserAvatar user={landlord} size="lg" />
                    <div>
                      <p className="font-display text-lg font-medium text-foreground">
                        {landlord.firstname} {landlord.lastname}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        {landlord.isVerified && (
                          <TrustBadge tone="olive" icon={ShieldCheck}>
                            {t('detail.verifiedHost', 'Verified host')}
                          </TrustBadge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : !isScraped ? (
                <p className="text-sm text-muted-foreground">
                  {t('detail.notProvided', 'Contact information not available')}
                </p>
              ) : null}

              {phoneNumber && (
                <a
                  href={`tel:${phoneNumber.replace(/[^\d+]/g, '')}`}
                  className="group/phone flex items-center justify-between rounded-2xl border border-border/70 bg-surface-paper px-4 py-3 transition-colors hover:border-foreground/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-olive/10 text-olive">
                      <Phone className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-medium text-sm text-foreground">{phoneNumber}</p>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {t('detail.tapToCall', 'Tap to call')}
                      </p>
                    </div>
                  </div>
                  <Phone className="h-4 w-4 text-muted-foreground transition-transform group-hover/phone:translate-x-0.5" />
                </a>
              )}

              {!isScraped && landlord && (
                <Button className="w-full" size="lg">
                  <MessageSquare className="h-4 w-4" />
                  {t('details.contactLandlord', 'Message host')}
                </Button>
              )}

              {isScraped && sourceUrl && (
                <Button asChild variant="outline" className="w-full" size="lg">
                  <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    {t('detail.viewOriginal', 'View original')}{sourceSite ? ` · ${sourceSite}` : ''}
                  </a>
                </Button>
              )}

              <div className="flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {t('detail.curatedFooter', 'Curated for thoughtful renting')}
                </span>
              </div>
            </div>
          </LuxuryPanel>
        </aside>
      </div>
    </div>
  );
}

function FactRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-3 border-b border-border/40 pb-3">
      <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-border/60 bg-surface-paper text-foreground">
        {Icon ? <Icon className="h-4 w-4" /> : null}
      </span>
      <div className="space-y-0.5">
        <p className="text-eyebrow">{label}</p>
        <p className="font-display text-base font-medium text-foreground capitalize">{value}</p>
      </div>
    </div>
  );
}

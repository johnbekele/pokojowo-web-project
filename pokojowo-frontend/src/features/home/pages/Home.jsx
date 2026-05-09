import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Star,
  Home as HomeIcon,
  Users,
  ShieldCheck,
  MessageSquare,
  Building2,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  EditorialSection,
  Eyebrow,
  DisplayTitle,
  EditorialRule,
  LuxuryPanel,
  MediaFrame,
  TrustBadge,
} from '@/components/shared/editorial';
import api from '@/lib/api';
import useAuthStore from '@/stores/authStore';
import { formatCurrency, cn } from '@/lib/utils';

const HERO_SLIDES = [
  {
    image: '/images/promo/romm1.png',
    fallback: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1920&q=80',
  },
  {
    image: '/images/promo/modern-room.avif',
    fallback: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1920&q=80',
  },
  {
    image: '/images/promo/Roommate-Finder.webp',
    fallback: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1920&q=80',
  },
  {
    image: '/images/promo/apartment-hotels.jpg',
    fallback: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1920&q=80',
  },
];

const FALLBACK_LISTING_IMAGE = '/images/promo/modern-room.avif';

export default function Home() {
  const { t } = useTranslation('home');
  const { user, isAuthenticated } = useAuthStore();
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSlide((p) => (p + 1) % HERO_SLIDES.length), 6500);
    return () => clearInterval(id);
  }, []);

  const isLandlord = user?.role?.some((r) => r.toLowerCase() === 'landlord');

  return (
    <div className="space-y-24 lg:space-y-32">
      <HomeHero
        t={t}
        slide={slide}
        setSlide={setSlide}
        isAuthenticated={isAuthenticated}
        isLandlord={isLandlord}
      />

      <HomePathways t={t} isAuthenticated={isAuthenticated} />

      <HomeStory t={t} />

      <HomeFeatured t={t} />

      <HomeManifesto t={t} isAuthenticated={isAuthenticated} user={user} />

      <HomeHosts t={t} isAuthenticated={isAuthenticated} isLandlord={isLandlord} />
    </div>
  );
}

/* ───────────────────────────── HERO ───────────────────────────── */

function HomeHero({ t, slide, setSlide, isAuthenticated, isLandlord }) {
  const current = HERO_SLIDES[slide];

  return (
    <EditorialSection className="reveal-up">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div className="space-y-7">
          <div className="flex items-center gap-3">
            <Eyebrow>{t('hero.dateline')}</Eyebrow>
            <span className="hidden sm:block h-px w-10 bg-border" />
            <span className="hidden sm:block text-eyebrow">{t('hero.eyebrow')}</span>
          </div>

          <DisplayTitle size="lg" italicWord={t('hero.italic')}>
            {t('hero.headline')}
          </DisplayTitle>

          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('hero.subhead')}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {isAuthenticated ? (
              <>
                <Button size="lg" asChild>
                  <Link to={isLandlord ? '/landlord/dashboard' : '/matches'}>
                    {isLandlord ? t('hosts.ctaSignedIn') : t('hero.secondaryCtaAuthed')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/discover">
                    {t('hero.primaryCtaAuthed')}
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button size="lg" asChild>
                  <Link to="/signup">
                    {t('hero.secondaryCta')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/discover">{t('hero.primaryCta')}</Link>
                </Button>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" />
              <span>
                <span className="font-semibold text-foreground">4.8</span>{' '}
                {t('hero.metric.rating')}
              </span>
            </div>
            <div className="hidden sm:block h-3 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-olive" />
              <span>
                <span className="font-semibold text-foreground">94%</span>{' '}
                {t('hero.metric.compatibility')}
              </span>
            </div>
            <div className="hidden sm:block h-3 w-px bg-border" />
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-foreground/70" />
              <span>{t('hero.metric.reviewed')}</span>
            </div>
          </div>
        </div>

        <div className="relative">
          <MediaFrame
            src={current.image}
            fallbackSrc={current.fallback}
            alt=""
            rounded="rounded-[1.75rem]"
            aspect="aspect-[4/5]"
            className="shadow-premium-lg"
          >
            {HERO_SLIDES.map((s, idx) => (
              <motion.img
                key={s.image}
                src={s.image}
                onError={(e) => {
                  if (s.fallback) e.target.src = s.fallback;
                }}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                initial={false}
                animate={{ opacity: idx === slide ? 1 : 0 }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-surface-onyx/70 via-surface-onyx/10 to-transparent" />
            <div className="absolute inset-x-5 bottom-5 flex items-end justify-between text-white">
              <div className="flex items-center gap-1.5">
                {HERO_SLIDES.map((s, idx) => (
                  <button
                    key={s.image}
                    onClick={() => setSlide(idx)}
                    aria-label={`Slide ${idx + 1}`}
                    className={cn(
                      'h-1 rounded-full transition-all duration-500',
                      idx === slide ? 'w-8 bg-white' : 'w-3 bg-white/40 hover:bg-white/70',
                    )}
                  />
                ))}
              </div>
              <span className="text-eyebrow text-white/70">
                № {String(slide + 1).padStart(2, '0')} / {String(HERO_SLIDES.length).padStart(2, '0')}
              </span>
            </div>
          </MediaFrame>

          <div className="hidden md:block absolute -left-10 top-14 rotate-[-6deg]">
            <div className="rounded-full bg-card px-4 py-2 shadow-premium border border-border/60">
              <span className="text-eyebrow">Pokojowo · Vol. 01</span>
            </div>
          </div>
        </div>
      </div>
    </EditorialSection>
  );
}

/* ─────────────────────────── PATHWAYS ─────────────────────────── */

function HomePathways({ t, isAuthenticated }) {
  return (
    <EditorialSection>
      <EditorialRule label={t('pathways.eyebrow')} />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div className="space-y-3">
          <DisplayTitle size="md" italicWord={t('pathways.italic')} as="h2">
            {t('pathways.title')}
          </DisplayTitle>
        </div>
        <p className="max-w-md text-sm text-muted-foreground sm:text-base">
          {t('pathways.description')}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mt-8">
        <PathwayCard
          to="/discover"
          tag={t('pathways.rooms.tag')}
          title={t('pathways.rooms.title')}
          description={t('pathways.rooms.description')}
          cta={t('pathways.rooms.cta')}
          stat={t('pathways.rooms.stat')}
          image="/images/promo/romm1.png"
          fallback="/images/promo/modern-room.avif"
          tone="ink"
          icon={HomeIcon}
        />
        <PathwayCard
          to={isAuthenticated ? '/matches' : '/signup'}
          tag={t('pathways.flatmates.tag')}
          title={t('pathways.flatmates.title')}
          description={t('pathways.flatmates.description')}
          cta={
            isAuthenticated
              ? t('pathways.flatmates.ctaSignedIn')
              : t('pathways.flatmates.ctaSignedOut')
          }
          stat={t('pathways.flatmates.stat')}
          image="/images/promo/Roommate-Finder.webp"
          fallback="/images/promo/roomate1.webp"
          tone="accent"
          icon={Users}
          extra={
            !isAuthenticated && (
              <p className="text-xs text-white/70">
                {t('pathways.flatmates.loginPrompt')}{' '}
                <Link to="/login" className="font-medium text-white underline underline-offset-4">
                  {t('pathways.flatmates.signIn')}
                </Link>
              </p>
            )
          }
        />
      </div>
    </EditorialSection>
  );
}

function PathwayCard({
  to,
  tag,
  title,
  description,
  cta,
  stat,
  image,
  fallback,
  icon: Icon,
  tone,
  extra,
}) {
  return (
    <Link
      to={to}
      className="group/path relative flex flex-col overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-editorial transition-all duration-500 hover:-translate-y-0.5 hover:shadow-premium-lg"
    >
      <div className="relative h-64 overflow-hidden md:h-72">
        <img
          src={image}
          alt=""
          loading="lazy"
          onError={(e) => {
            if (fallback) e.target.src = fallback;
          }}
          className="h-full w-full object-cover transition-transform [transition-duration:1400ms] ease-out group-hover/path:scale-[1.04]"
        />
        <div
          className={cn(
            'absolute inset-0',
            tone === 'ink'
              ? 'bg-gradient-to-t from-surface-onyx/90 via-surface-onyx/30 to-transparent'
              : 'bg-gradient-to-t from-accent/85 via-accent/20 to-transparent',
          )}
        />
        <div className="absolute left-5 top-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-paper/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-foreground backdrop-blur">
            <Icon className="h-3 w-3" />
            {tag}
          </span>
        </div>

        <div className="absolute inset-x-5 bottom-5 space-y-3 text-white">
          <h3 className="font-display text-3xl font-medium leading-tight tracking-editorial">
            {title}
          </h3>
          <p className="max-w-md text-sm leading-relaxed text-white/85">{description}</p>
          {extra ? <div className="pt-1">{extra}</div> : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border/60 bg-surface-paper px-6 py-4">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-eyebrow">{stat}</span>
          <span className="font-display text-base font-medium text-foreground">{cta}</span>
        </div>
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-300 group-hover/path:translate-x-1">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

/* ───────────────────────────── STORY ─────────────────────────── */

function HomeStory({ t }) {
  const steps = [
    {
      key: 'one',
      title: t('story.steps.one.title'),
      description: t('story.steps.one.description'),
      icon: ShieldCheck,
    },
    {
      key: 'two',
      title: t('story.steps.two.title'),
      description: t('story.steps.two.description'),
      icon: Users,
    },
    {
      key: 'three',
      title: t('story.steps.three.title'),
      description: t('story.steps.three.description'),
      icon: MessageSquare,
    },
  ];

  return (
    <EditorialSection>
      <EditorialRule label={t('story.eyebrow')} />

      <div className="grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-14 mt-8">
        <DisplayTitle size="md" italicWord={t('story.italic')} as="h2">
          {t('story.title')}
        </DisplayTitle>

        <div className="grid gap-6 sm:grid-cols-3">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex flex-col gap-3 rounded-2xl border border-border/70 bg-surface-paper p-6 shadow-editorial"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-3xl font-light leading-none text-foreground/40">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-canvas text-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <h3 className="font-display text-xl font-medium tracking-editorial text-foreground">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </EditorialSection>
  );
}

/* ───────────────────────── FEATURED LISTINGS ─────────────────── */

function HomeFeatured({ t }) {
  const { t: tListings, i18n } = useTranslation('listings');

  const { data: rawListings, isLoading } = useQuery({
    queryKey: ['home-featured-listings'],
    queryFn: async () => {
      const response = await api.get('/listings/?sort=newest');
      return response.data;
    },
  });

  const listings = (Array.isArray(rawListings) ? rawListings : rawListings?.listings || []).slice(0, 3);

  const getLocalizedText = (field) => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[i18n.language] || field.en || field.pl || '';
  };

  return (
    <EditorialSection>
      <EditorialRule label={t('featured.eyebrow')} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mt-8">
        <DisplayTitle size="md" italicWord={t('featured.italic')} as="h2">
          {t('featured.title')}
        </DisplayTitle>
        <Link
          to="/discover"
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-accent"
        >
          {t('featured.viewAll')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-6 mt-8 md:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/5] w-full rounded-[1.5rem]" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))
          : listings.map((listing, index) => {
              const listingId = listing._id || listing.id;
              const image =
                listing.images?.[0] || listing.photos?.[0]?.url || FALLBACK_LISTING_IMAGE;
              return (
                <Link
                  key={listingId}
                  to={`/listing/${listingId}`}
                  className="group/card flex flex-col"
                >
                  <MediaFrame
                    src={image}
                    fallbackSrc={FALLBACK_LISTING_IMAGE}
                    alt={getLocalizedText(listing.title) || listing.address}
                    rounded="rounded-[1.5rem]"
                    aspect="aspect-[4/5]"
                    className="shadow-editorial transition-shadow duration-500 group-hover/card:shadow-premium-lg"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-onyx/55 via-transparent to-transparent" />
                    <div className="absolute left-4 top-4">
                      <span className="rounded-full bg-surface-paper/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-foreground backdrop-blur">
                        № {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="absolute inset-x-4 bottom-4 flex items-end justify-between text-white">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">
                          {tListings('card.from', 'From')}
                        </p>
                        <p className="font-display text-2xl font-medium leading-none">
                          {formatCurrency(listing.price || listing.rent)}
                          <span className="ml-1 text-xs font-medium text-white/70">
                            / {tListings('card.month', 'mo')}
                          </span>
                        </p>
                      </div>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/10 backdrop-blur transition-transform duration-500 group-hover/card:bg-white group-hover/card:text-foreground group-hover/card:scale-110">
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </div>
                  </MediaFrame>
                  <div className="space-y-1 px-1 pt-4">
                    <h3 className="font-display text-lg font-medium leading-snug tracking-editorial text-foreground transition-colors duration-300 group-hover/card:text-accent">
                      {getLocalizedText(listing.title) || listing.address}
                    </h3>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {listing.location || listing.address}
                    </p>
                  </div>
                </Link>
              );
            })}
      </div>
    </EditorialSection>
  );
}

/* ─────────────────────── MANIFESTO / SIGN-IN CTA ──────────────── */

function HomeManifesto({ t, isAuthenticated, user }) {
  return (
    <EditorialSection>
      <LuxuryPanel tone="ink" className="overflow-hidden p-0">
        <div className="relative grid items-center gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6 p-8 lg:p-12">
            <Eyebrow className="text-[hsl(var(--surface-paper)/0.65)]">
              {t('manifesto.eyebrow')}
            </Eyebrow>
            <h2 className="font-display text-display-md font-medium leading-[1.05] tracking-editorial text-[hsl(var(--surface-paper))]">
              {t('manifesto.title')}{' '}
              <span className="font-display italic text-accent">{t('manifesto.italic')}</span>
            </h2>
            <p className="max-w-xl text-base leading-relaxed text-[hsl(var(--surface-paper)/0.75)]">
              {isAuthenticated
                ? t('manifesto.description', { defaultValue: t('manifesto.description') })
                : t('manifesto.description')}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {isAuthenticated ? (
                <>
                  <Button size="lg" variant="accent" asChild>
                    <Link to="/matches">
                      {t('manifesto.signedInCta')}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="border-[hsl(var(--surface-paper)/0.4)] bg-transparent text-[hsl(var(--surface-paper))] hover:bg-[hsl(var(--surface-paper)/0.1)]"
                  >
                    <Link to="/discover">{t('manifesto.signedInSecondary')}</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button size="lg" variant="accent" asChild>
                    <Link to="/signup">
                      {t('manifesto.primaryCta')}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="border-[hsl(var(--surface-paper)/0.4)] bg-transparent text-[hsl(var(--surface-paper))] hover:bg-[hsl(var(--surface-paper)/0.1)]"
                  >
                    <Link to="/login">{t('manifesto.secondaryCta')}</Link>
                  </Button>
                </>
              )}
            </div>

            {isAuthenticated && user?.firstname ? (
              <p className="pt-4 text-xs uppercase tracking-[0.22em] text-[hsl(var(--surface-paper)/0.55)]">
                Signed in as {user.firstname}
              </p>
            ) : null}
          </div>

          <div className="relative hidden h-full min-h-[320px] lg:block">
            <img
              src="/images/promo/roomate1.webp"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.target.src = '/images/promo/Roommate-Finder.webp';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-surface-onyx/30 to-surface-onyx" />
            <div className="absolute inset-0 bg-mesh opacity-40" />
          </div>
        </div>
      </LuxuryPanel>
    </EditorialSection>
  );
}

/* ─────────────────────────── HOSTS ───────────────────────────── */

function HomeHosts({ t, isAuthenticated, isLandlord }) {
  const showLandlordCTA = isAuthenticated && isLandlord;
  return (
    <EditorialSection>
      <div className="grid gap-6 rounded-[1.75rem] border border-border/70 bg-surface-paper p-8 shadow-editorial sm:grid-cols-[1.4fr_auto] sm:items-center sm:gap-10 lg:p-12">
        <div className="space-y-3">
          <Eyebrow>{t('hosts.eyebrow')}</Eyebrow>
          <h3 className="font-display text-3xl font-medium tracking-editorial text-foreground">
            {t('hosts.title')}
          </h3>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t('hosts.description')}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          <Button asChild size="lg" variant="default">
            <Link to={showLandlordCTA ? '/landlord/dashboard' : '/signup?role=landlord'}>
              <Building2 className="h-4 w-4" />
              {showLandlordCTA ? t('hosts.ctaSignedIn') : t('hosts.cta')}
            </Link>
          </Button>
          <TrustBadge tone="olive" icon={ShieldCheck}>
            Verified hosts
          </TrustBadge>
        </div>
      </div>
    </EditorialSection>
  );
}

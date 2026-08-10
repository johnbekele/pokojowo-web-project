import { useState, useMemo, useEffect, useRef, lazy, Suspense } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  MapPin,
  Map as MapIcon,
  List,
  Home,
  Bed,
  Users,
  ArrowUpRight,
  Bookmark,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EditorialSection,
  Eyebrow,
  DisplayTitle,
  EditorialRule,
  LuxuryPanel,
  MediaFrame,
} from "@/components/shared/editorial";
import SearchFilters from "../components/SearchFilters";
// Leaflet and its CSS are around 50 KB gzipped, which everyone arriving on
// this page used to pay for whether or not they ever opened the map.
const MapSearchView = lazy(() => import("../components/MapSearchView"));
import SaveSearchDialog from "../components/SaveSearchDialog";
import InterestedUsersPreview from "../components/InterestedUsersPreview";
import ListingLikeButton from "../components/ListingLikeButton";
import api, { normalizeError } from "@/lib/api";
import { listingParams, MAX_PRICE, MAX_SIZE } from "@/lib/listingQuery";
import { formatCurrency, cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import useAuthStore from "@/stores/authStore";
import { useBatchInterestedUsers } from "@/hooks/useListingInteractions";

const FALLBACK_LISTING_IMAGE = "/images/promo/modern-room.avif";
const LISTING_PAGE_SIZE = 20;
const DISCOVER_SCROLL_KEY = "pokojowo.discover.scroll-y";

const DEFAULT_FILTERS = {
  minPrice: 0,
  maxPrice: 10000,
  minSize: 0,
  maxSize: 200,
  roomTypes: [],
  buildingTypes: [],
  rentFor: [],
  maxTenants: null,
  city: '',
  districts: [],
  offeredBy: null,
};

// True when the user has set anything worth saving — mirrors the active-count
// logic in SearchFilters, plus the free-text search box.
function hasActiveFilters(filters, search) {
  return (
    !!search ||
    filters.minPrice > 0 ||
    filters.maxPrice < MAX_PRICE ||
    filters.minSize > 0 ||
    filters.maxSize < MAX_SIZE ||
    filters.roomTypes?.length > 0 ||
    filters.buildingTypes?.length > 0 ||
    filters.rentFor?.length > 0 ||
    !!filters.maxTenants ||
    !!filters.city ||
    filters.districts?.length > 0 ||
    !!filters.offeredBy
  );
}

// Map a saved-search API response back into the DEFAULT_FILTERS shape so it can
// be applied to local filter state.
function savedSearchToFilters(s) {
  return {
    minPrice: s.minPrice ?? 0,
    maxPrice: s.maxPrice ?? MAX_PRICE,
    minSize: s.minSize ?? 0,
    maxSize: s.maxSize ?? MAX_SIZE,
    roomTypes: s.roomTypes || [],
    buildingTypes: s.buildingTypes || [],
    rentFor: s.rentFor || [],
    maxTenants: s.maxTenants ?? null,
    city: s.city || '',
    districts: s.districts || [],
    offeredBy: s.offeredBy ?? null,
  };
}

// Each chip displays a localized label but searches with the canonical English
// query so it matches addresses already stored in the database.
const CITY_CHIPS = [
  { key: "warsaw", query: "Warsaw" },
  { key: "krakow", query: "Krakow" },
  { key: "wroclaw", query: "Wroclaw" },
  { key: "poznan", query: "Poznan" },
  { key: "gdansk", query: "Gdansk" },
  { key: "lodz", query: "Lodz" },
];

export default function HomeListings() {
  const { t } = useTranslation("listings");
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();

  // View lives in the URL so a map search can be shared or reloaded, and so
  // filters/sort/saved searches stay shared between both views.
  const isMapView = searchParams.get("view") === "map";
  const setView = (view) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (view === "map") next.set("view", "map");
        else next.delete("view");
        return next;
      },
      { replace: true },
    );
  };
  // Keep the browse context when a user opens a listing and goes back. The
  // query cache keeps the loaded pages, while this restores the exact place
  // in the document after the route remounts.
  const restoredScroll = useRef(false);
  useEffect(() => {
    return () => {
      sessionStorage.setItem(DISCOVER_SCROLL_KEY, String(window.scrollY));
    };
  }, []);

  // Apply a saved search from ?savedSearch=<id> once per id (deep-link target
  // for notifications and the profile "Run" button). 404 → toast + strip param.
  const appliedSavedSearch = useRef(null);
  useEffect(() => {
    const id = searchParams.get("savedSearch");
    if (!id || appliedSavedSearch.current === id) return;
    appliedSavedSearch.current = id;
    (async () => {
      try {
        const { data } = await api.get(`/saved-searches/${id}`);
        setFilters(savedSearchToFilters(data));
        setSearchQuery(data.search || "");
      } catch (error) {
        const { status } = normalizeError(error);
        toast({
          title:
            status === 404
              ? t("savedSearches.applyNotFound", "That saved search no longer exists")
              : t("savedSearches.applyFailed", "Could not load that saved search"),
          variant: "destructive",
        });
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete("savedSearch");
            return next;
          },
          { replace: true },
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data: listingPages,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["listings", debouncedSearch, sortBy, filters],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const params = listingParams({
        search: debouncedSearch,
        sort: sortBy,
        filters,
        skip: pageParam,
        limit: LISTING_PAGE_SIZE,
        withMeta: true,
      });
      const response = await api.get(`/listings/?${params.toString()}`);
      const payload = response.data;
      const listings = Array.isArray(payload) ? payload : payload?.listings || [];

      return {
        listings,
        total: Array.isArray(payload) ? null : payload?.total ?? null,
        skip: Array.isArray(payload) ? pageParam : payload?.skip ?? pageParam,
        hasMore:
          Array.isArray(payload)
            ? listings.length === LISTING_PAGE_SIZE
            : Boolean(payload?.hasMore),
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.skip + lastPage.listings.length : undefined,
    // Map view fetches its own area-scoped results.
    enabled: !isMapView,
  });

  const listings = useMemo(() => {
    return listingPages?.pages.flatMap((page) => page.listings) || [];
  }, [listingPages]);

  const totalListings = listingPages?.pages[0]?.total ?? listings.length;

  const listingIds = useMemo(
    () => listings.map((listing) => listing._id || listing.id).filter(Boolean),
    [listings],
  );
  const { usersByListing: interestedUsersByListing } = useBatchInterestedUsers(
    listingIds,
    { minCompatibility: 70, limitPerListing: 3 },
    { enabled: Boolean(user) },
  );

  useEffect(() => {
    if (isLoading || restoredScroll.current) return;
    const savedScroll = Number(sessionStorage.getItem(DISCOVER_SCROLL_KEY));
    restoredScroll.current = true;
    if (savedScroll > 0) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedScroll, behavior: "auto" });
        sessionStorage.removeItem(DISCOVER_SCROLL_KEY);
      });
    }
  }, [isLoading]);

  return (
    <div className="space-y-12 lg:space-y-16">
      {/* ─── DISCOVER HEADER ─────────────────────────────────────────── */}
      <EditorialSection className="reveal-up">
        <div className="space-y-3">
          <Eyebrow>{t("results.section", "The Index")}</Eyebrow>
          <DisplayTitle size="md" italicWord={t("results.italic", "this week.")} as="h1">
            {t("results.heading", "Rooms in the index,")}
          </DisplayTitle>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            {t(
              "results.tagline",
              "Every room is reviewed by hand. No screaming photos, no surprise fees.",
            )}
          </p>
        </div>

        <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-2.5 shadow-editorial sm:flex-row sm:items-center sm:p-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("search.placeholder", "City, neighbourhood, vibe…")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 border-none bg-transparent pl-11 text-base placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-surface-canvas p-1">
              <button
                type="button"
                onClick={() => setView("list")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  !isMapView
                    ? "bg-foreground text-background"
                    : "text-foreground/70 hover:text-foreground",
                )}
              >
                <List className="h-3.5 w-3.5" />
                {t("view.list", "List")}
              </button>
              <button
                type="button"
                onClick={() => setView("map")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  isMapView
                    ? "bg-foreground text-background"
                    : "text-foreground/70 hover:text-foreground",
                )}
              >
                <MapIcon className="h-3.5 w-3.5" />
                {t("view.map", "Map")}
              </button>
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-11 min-w-[170px] rounded-full border-border/70 bg-surface-canvas px-5 text-sm">
                <SelectValue placeholder={t("search.sort")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t("search.sortOptions.newest")}</SelectItem>
                <SelectItem value="price_asc">{t("search.sortOptions.priceAsc")}</SelectItem>
                <SelectItem value="price_desc">{t("search.sortOptions.priceDesc")}</SelectItem>
              </SelectContent>
            </Select>
            <SearchFilters
              filters={filters}
              onFiltersChange={setFilters}
              onReset={() => setFilters(DEFAULT_FILTERS)}
            />
            {user && hasActiveFilters(filters, searchQuery) && (
              <Button
                variant="outline"
                className="gap-2 min-h-[44px]"
                onClick={() => setShowSaveDialog(true)}
              >
                <Bookmark className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {t("savedSearches.button", "Save search")}
                </span>
              </Button>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-eyebrow mr-2">{t("hero.cities", "Cities")}</span>
          {CITY_CHIPS.map((city) => {
            const label = t(`cities.${city.key}`, city.query);
            const isActive = searchQuery.toLowerCase() === city.query.toLowerCase();
            return (
              <button
                key={city.key}
                onClick={() => setSearchQuery(city.query)}
                className={cn(
                  "rounded-full border px-3.5 py-1 text-xs font-medium transition-colors duration-300",
                  isActive
                    ? "border-foreground bg-foreground text-background"
                    : "border-border/60 bg-surface-paper text-foreground/80 hover:border-foreground/30 hover:text-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </EditorialSection>

      {isMapView ? (
        <EditorialSection>
          <Suspense fallback={<MapViewSkeleton />}>
            <MapSearchView search={debouncedSearch} sort={sortBy} filters={filters} />
          </Suspense>
        </EditorialSection>
      ) : (
        <ListingsGrid
          isLoading={isLoading}
          error={error}
          listings={listings}
          totalListings={totalListings}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          refetch={refetch}
          interestedUsersByListing={interestedUsersByListing}
        />
      )}

      <SaveSearchDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        filters={filters}
        search={searchQuery}
      />
    </div>
  );
}

/** Holds the map's shape while its chunk downloads, so the page does not jump. */
function MapViewSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      <div className="order-2 space-y-3 lg:order-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="order-1 h-[60vh] w-full rounded-2xl lg:order-2 lg:h-[70vh]" />
    </div>
  );
}

function ListingsGrid({
  isLoading,
  error,
  listings,
  totalListings,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  refetch,
  interestedUsersByListing,
}) {
  const { t } = useTranslation("listings");

  return (
    <>
      <EditorialRule
        label={
          isLoading
            ? t("results.searching", "Curating rooms")
            : t("results.count", { count: totalListings || 0 })
        }
      />

      {/* ─── LISTINGS GRID ────────────────────────────────────────────── */}
      <EditorialSection>
        {isLoading ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[4/5] w-full rounded-[1.5rem]" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : error ? (
          <LuxuryPanel className="text-center py-16" tone="parchment">
            <Eyebrow>{t("error.eyebrow", "Something went off the press")}</Eyebrow>
            <h3 className="mt-3 font-display text-2xl font-medium text-foreground">
              {t("error.title")}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {error.message || t("error.loadingFailed")}
            </p>
            <Button variant="outline" className="mt-6" onClick={() => refetch()}>
              {t("error.retry")}
            </Button>
          </LuxuryPanel>
        ) : listings?.length === 0 ? (
          <LuxuryPanel className="text-center py-20" tone="parchment">
            <Eyebrow>{t("empty.eyebrow", "Quiet pages today")}</Eyebrow>
            <h3 className="mt-3 font-display text-2xl font-medium text-foreground">
              {t("empty.title")}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
              {t("empty.subtitle")}
            </p>
          </LuxuryPanel>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing, index) => {
              const listingId = listing._id || listing.id;
              const interestedUsers = interestedUsersByListing[listingId] || [];
              return (
                <ListingCard
                  key={listingId}
                  listing={listing}
                  interestedUsers={interestedUsers}
                  index={index}
                />
              );
            })}
          </div>
        )}

        {!isLoading && !error && listings?.length > 0 && hasNextPage && (
          <div className="mt-10 flex justify-center">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="min-w-44"
            >
              {isFetchingNextPage
                ? t("results.loadingMore", "Loading more")
                : t("results.loadMore", "Load more")}
            </Button>
          </div>
        )}
      </EditorialSection>
    </>
  );
}

function ListingCard({ listing, interestedUsers = [], index = 0 }) {
  const { t, i18n } = useTranslation("listings");

  const getLocalizedText = (field) => {
    if (!field) return "";
    if (typeof field === "string") return field;
    return field[i18n.language] || field.en || field.pl || "";
  };

  const listingId = listing._id || listing.id;
  const image =
    listing.images?.[0] || listing.photos?.[0]?.url || FALLBACK_LISTING_IMAGE;
  const description = getLocalizedText(listing.description);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: Math.min(index, 6) * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="group/card relative flex flex-col"
    >
      <Link to={`/listing/${listingId}`} className="block">
        <MediaFrame
          src={image}
          fallbackSrc={FALLBACK_LISTING_IMAGE}
          alt={getLocalizedText(listing.title) || listing.address}
          rounded="rounded-[1.5rem]"
          aspect="aspect-[4/5]"
          className="shadow-editorial transition-shadow duration-500 group-hover/card:shadow-premium-lg"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-surface-onyx/55 via-surface-onyx/0 to-surface-onyx/0" />

          {/* Top markers */}
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <span className="rounded-full bg-surface-paper/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-foreground backdrop-blur">
              № {String(index + 1).padStart(2, "0")}
            </span>
            {listing.roomType && (
              <span className="rounded-full bg-surface-paper/85 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-foreground backdrop-blur">
                {listing.roomType}
              </span>
            )}
            {(listing.offeredBy === 'owner' || listing.offeredBy === 'agency') && (
              <span className="rounded-full bg-surface-paper/85 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-foreground backdrop-blur">
                {listing.offeredBy === 'owner'
                  ? t('card.privateOwner', 'Private owner')
                  : t('card.agency', 'Agency')}
              </span>
            )}
          </div>

          <div className="absolute right-4 top-4">
            <ListingLikeButton listingId={listingId} size="small" />
          </div>

          {/* Bottom price tag */}
          <div className="absolute inset-x-4 bottom-4 flex items-end justify-between text-white">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">
                {listing.location || t("card.from", "From")}
              </p>
              <p className="font-display text-3xl font-medium leading-none">
                {formatCurrency(listing.price || listing.rent)}
                <span className="ml-1 align-baseline text-xs font-medium text-white/70">
                  / {t("card.month", "mo")}
                </span>
              </p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/10 backdrop-blur transition-transform duration-500 group-hover/card:scale-110 group-hover/card:bg-white group-hover/card:text-foreground">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </MediaFrame>

        <div className="space-y-3 px-1 pt-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-xl font-medium leading-snug tracking-editorial text-foreground transition-colors duration-300 group-hover/card:text-accent">
              {getLocalizedText(listing.title) || listing.address}
            </h3>
            {listing.available && (
              <Badge variant="olive" className="flex-shrink-0">
                {t("card.available")}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{listing.location || listing.address}</span>
          </div>

          {description ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {listing.size && (
              <span className="inline-flex items-center gap-1.5">
                <Home className="h-3 w-3" /> {listing.size} m²
              </span>
            )}
            {listing.maxTenants && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3 w-3" /> {t("card.tenants", { count: listing.maxTenants })}
              </span>
            )}
            {listing.buildingType && (
              <span className="inline-flex items-center gap-1.5">
                <Bed className="h-3 w-3" /> {listing.buildingType}
              </span>
            )}
          </div>

          {interestedUsers.length > 0 && (
            <InterestedUsersPreview users={interestedUsers} className="mt-1" />
          )}
        </div>
      </Link>
    </motion.article>
  );
}

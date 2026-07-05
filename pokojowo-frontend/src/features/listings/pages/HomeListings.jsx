import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  MapPin,
  Home,
  Bed,
  Users,
  ArrowUpRight,
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
import InterestedUsersPreview from "../components/InterestedUsersPreview";
import ListingLikeButton from "../components/ListingLikeButton";
import api from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import useListingInteractionStore from "@/stores/listingInteractionStore";
import useAuthStore from "@/stores/authStore";

const FALLBACK_LISTING_IMAGE = "/images/promo/modern-room.avif";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const { user } = useAuthStore();
  const { fetchBatchInterestedUsers, fetchMyLikedListings, getInterestedUsers } =
    useListingInteractionStore();

  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: rawListings, isLoading, error, refetch } = useQuery({
    queryKey: ["listings", debouncedSearch, sortBy, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      params.append("sort", sortBy);
      if (filters.minPrice > 0) params.append("min_price", filters.minPrice);
      if (filters.maxPrice < 10000) params.append("max_price", filters.maxPrice);
      if (filters.minSize > 0) params.append("min_size", filters.minSize);
      if (filters.maxSize < 200) params.append("max_size", filters.maxSize);
      filters.roomTypes?.forEach((v) => params.append("room_type", v));
      filters.buildingTypes?.forEach((v) => params.append("building_type", v));
      filters.rentFor?.forEach((v) => params.append("rent_for", v));
      if (filters.maxTenants) params.append("max_tenants", filters.maxTenants);
      if (filters.city) params.append("city", filters.city);
      filters.districts?.forEach((v) => params.append("district", v));
      if (filters.offeredBy) params.append("offered_by", filters.offeredBy);
      const response = await api.get(`/listings/?${params.toString()}`);
      return response.data;
    },
  });

  const listings = useMemo(() => {
    return Array.isArray(rawListings) ? rawListings : rawListings?.listings || [];
  }, [rawListings]);

  useEffect(() => {
    if (user && listings && listings.length > 0) {
      const listingIds = listings.map((l) => l._id || l.id).filter(Boolean);
      if (listingIds.length > 0) fetchBatchInterestedUsers(listingIds, 70, 3);
    }
  }, [user, listings, fetchBatchInterestedUsers]);

  useEffect(() => {
    if (user) fetchMyLikedListings();
  }, [user, fetchMyLikedListings]);

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

      <EditorialRule
        label={
          isLoading
            ? t("results.searching", "Curating rooms")
            : t("results.count", { count: listings?.length || 0 })
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
              const interestedUsers = getInterestedUsers(listingId);
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
      </EditorialSection>
    </div>
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

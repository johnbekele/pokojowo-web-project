import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Search,
  MapPin,
  Home,
  Bed,
  Bath,
  Wifi,
  Car,
  ChevronRight,
  Users,
  Heart,
  Sparkles,
  ArrowRight,
} from "lucide-react";

// Hero slides with images and promo content (titles/subtitles use translation keys)
const HERO_SLIDES = [
  {
    image: "/images/promo/romm1.png",
    fallback:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1920&q=80",
    titleKey: "hero.slides.roommate1.title",
    subtitleKey: "hero.slides.roommate1.subtitle",
    type: "roommate",
  },
  {
    image:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1920&q=80",
    titleKey: "hero.slides.room1.title",
    subtitleKey: "hero.slides.room1.subtitle",
    type: "room",
  },
  {
    image: "/images/promo/Roommate-Finder.webp",
    fallback:
      "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1920&q=80",
    titleKey: "hero.slides.roommate2.title",
    subtitleKey: "hero.slides.roommate2.subtitle",
    type: "roommate",
  },
  {
    image:
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1920&q=80",
    titleKey: "hero.slides.room2.title",
    subtitleKey: "hero.slides.room2.subtitle",
    type: "room",
  },
];

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import SearchFilters from "../components/SearchFilters";
import InterestedUsersPreview from "../components/InterestedUsersPreview";
import ListingLikeButton from "../components/ListingLikeButton";
import api from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import useListingInteractionStore from "@/stores/listingInteractionStore";
import useAuthStore from "@/stores/authStore";

const DEFAULT_FILTERS = {
  minPrice: 0,
  maxPrice: 10000,
  minSize: 0,
  maxSize: 200,
  roomTypes: [],
  buildingTypes: [],
  rentFor: [],
  maxTenants: null,
};

export default function HomeListings() {
  const { t } = useTranslation("listings");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { user } = useAuthStore();
  const {
    fetchBatchInterestedUsers,
    fetchMyLikedListings,
    getInterestedUsers,
  } = useListingInteractionStore();

  // Rotate hero slides every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Get current slide content
  const currentSlide = HERO_SLIDES[currentImageIndex];

  // Debounced search query
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data: rawListings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["listings", debouncedSearch, sortBy, filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      // Search
      if (debouncedSearch) params.append("search", debouncedSearch);

      // Sort
      params.append("sort", sortBy);

      // Price filters
      if (filters.minPrice > 0) params.append("min_price", filters.minPrice);
      if (filters.maxPrice < 10000)
        params.append("max_price", filters.maxPrice);

      // Size filters
      if (filters.minSize > 0) params.append("min_size", filters.minSize);
      if (filters.maxSize < 200) params.append("max_size", filters.maxSize);

      // Room type (send first selected if any)
      if (filters.roomTypes?.length > 0) {
        params.append("room_type", filters.roomTypes[0]);
      }

      // Building type (send first selected if any)
      if (filters.buildingTypes?.length > 0) {
        params.append("building_type", filters.buildingTypes[0]);
      }

      // Max tenants
      if (filters.maxTenants) params.append("max_tenants", filters.maxTenants);

      const response = await api.get(`/listings/?${params.toString()}`);
      return response.data;
    },
  });

  // Process listings (handle response format)
  const listings = useMemo(() => {
    const listingsArray = Array.isArray(rawListings)
      ? rawListings
      : rawListings?.listings || [];
    return listingsArray;
  }, [rawListings]);

  // Batch fetch interested users and liked listings when user is logged in and listings are loaded
  useEffect(() => {
    if (user && listings && listings.length > 0) {
      const listingIds = listings.map((l) => l._id || l.id).filter(Boolean);
      if (listingIds.length > 0) {
        fetchBatchInterestedUsers(listingIds, 70, 3);
      }
    }
  }, [user, listings, fetchBatchInterestedUsers]);

  // Fetch user's liked listings on mount
  useEffect(() => {
    if (user) {
      fetchMyLikedListings();
    }
  }, [user, fetchMyLikedListings]);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleFiltersReset = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <div className="space-y-8">
      {/* Hero Section with Rotating Images and Interactive Promo Cards */}
      <div className="relative rounded-2xl overflow-hidden min-h-[320px] md:min-h-[380px]">
        {/* Background Images */}
        {HERO_SLIDES.map((slide, index) => (
          <div
            key={slide.image}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000 ease-in-out",
              index === currentImageIndex ? "opacity-100" : "opacity-0",
            )}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                if (slide.fallback) e.target.src = slide.fallback;
              }}
            />
          </div>
        ))}

        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />

        {/* Content */}
        <div className="relative z-10 p-4 sm:p-6 md:p-8 h-full flex flex-col justify-between min-h-[320px] md:min-h-[380px]">
          {/* Top - Title & Search */}
          <div className="max-w-xl">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 text-white transition-all duration-500">
              {t(currentSlide.titleKey)}
            </h1>
            <p className="text-sm md:text-base text-white/80 mb-4 transition-all duration-500">
              {t(currentSlide.subtitleKey)}
            </p>

            {/* Search Bar */}
            <div className="flex gap-2 bg-white/10 backdrop-blur-md rounded-lg p-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <Input
                  placeholder={t("search.placeholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm"
                />
              </div>
              <Button size="sm" variant="secondary" className="h-10 px-4">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Bottom - Get Started Button */}
          {!user && (
            <div className="flex justify-end mt-4">
              <Link to="/login">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 px-5 bg-transparent hover:bg-white/10 text-white text-sm font-medium gap-2 border border-white/30"
                >
                  {t("hero.signupNow")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Image Indicators */}
        <div className="absolute bottom-3 right-3 z-10 flex gap-1.5">
          {HERO_SLIDES.map((slide, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all duration-300",
                index === currentImageIndex
                  ? slide.type === "roommate"
                    ? "bg-teal-400 w-4"
                    : "bg-white w-4"
                  : "bg-white/50 hover:bg-white/70",
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-card rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Home className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {listings?.length || 0} {t("results.count")}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-auto sm:min-w-[160px]">
              <SelectValue placeholder={t("search.sort")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">
                {t("search.sortOptions.newest")}
              </SelectItem>
              <SelectItem value="price_asc">
                {t("search.sortOptions.priceAsc")}
              </SelectItem>
              <SelectItem value="price_desc">
                {t("search.sortOptions.priceDesc")}
              </SelectItem>
            </SelectContent>
          </Select>
          <SearchFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onReset={handleFiltersReset}
          />
        </div>
      </div>

      {/* Listings Grid */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-52 w-full" />
              <CardHeader className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-800">
          <CardHeader className="text-center py-12">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
              <Home className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
              {t("error.title")}
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {error.message || t("error.loadingFailed")}
            </p>
            <Button
              variant="outline"
              className="mt-4 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
            >
              {t("error.retry")}
            </Button>
          </CardHeader>
        </Card>
      ) : listings?.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center py-16">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Home className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">
              {t("empty.title")}
            </h3>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
              {t("empty.subtitle")}
            </p>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings?.map((listing) => {
            const listingId = listing._id || listing.id;
            const interestedUsers = getInterestedUsers(listingId);
            return (
              <ListingCard
                key={listingId}
                listing={listing}
                interestedUsers={interestedUsers}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ListingCard({ listing, interestedUsers = [] }) {
  const { t, i18n } = useTranslation("listings");

  const getLocalizedText = (field) => {
    if (!field) return "";
    if (typeof field === "string") return field;
    return field[i18n.language] || field.en || field.pl || "";
  };

  const listingId = listing._id || listing.id;

  return (
    <Card className="group overflow-hidden border-border hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      {/* Image Container */}
      <div className="relative h-52 overflow-hidden bg-muted">
        <img
          src={
            listing.images?.[0] ||
            listing.photos?.[0]?.url ||
            "/placeholder-room.jpg"
          }
          alt={getLocalizedText(listing.title) || listing.address}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Like Button - Top Right */}
        <div className="absolute top-3 right-3 z-10">
          <ListingLikeButton listingId={listingId} size="small" />
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {listing.available && (
            <Badge className="bg-green-500 hover:bg-green-600 text-white font-medium shadow-lg">
              {t("card.available")}
            </Badge>
          )}
        </div>

        {/* Price Badge */}
        <div className="absolute bottom-3 right-3">
          <div className="bg-background/95 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-lg">
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(listing.price || listing.rent)}
            </p>
            <p className="text-xs text-muted-foreground text-right">
              {t("card.perMonth")}
            </p>
          </div>
        </div>
      </div>

      <CardContent className="p-5">
        {/* Title & Location */}
        <h3 className="font-semibold text-foreground text-lg line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {getLocalizedText(listing.title) || listing.address}
        </h3>
        <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm truncate">
            {listing.location || listing.address}
          </span>
        </div>

        <Separator className="my-4" />

        {/* Room Details */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {listing.roomType && (
            <Badge variant="outline" className="font-normal">
              {listing.roomType}
            </Badge>
          )}
          {listing.size && <span>{listing.size}m²</span>}
          {listing.maxTenants && (
            <span>
              {t("card.tenants", { count: listing.maxTenants })}
            </span>
          )}
        </div>

        {/* Description */}
        {getLocalizedText(listing.description) && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-3">
            {getLocalizedText(listing.description)}
          </p>
        )}

        {/* Amenities */}
        {listing.amenities?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {listing.amenities.slice(0, 3).map((amenity) => (
              <Badge
                key={amenity}
                variant="secondary"
                className="bg-muted text-muted-foreground hover:bg-muted/80"
              >
                {amenity}
              </Badge>
            ))}
            {listing.amenities.length > 3 && (
              <Badge
                variant="secondary"
                className="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
              >
                +{listing.amenities.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Interested Users Preview */}
        {interestedUsers.length > 0 && (
          <InterestedUsersPreview users={interestedUsers} className="mt-4" />
        )}
      </CardContent>

      <CardFooter className="p-5 pt-0">
        <Link to={`/listing/${listing._id || listing.id}`} className="w-full">
          <Button className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white group/btn">
            {t("card.viewDetails")}
            <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
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
  ArrowRight
} from 'lucide-react';

// Hero slides with images and promo content
const HERO_SLIDES = [
  {
    image: '/images/promo/roomate1.webp',
    fallback: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1920&q=80',
    title: 'Find Your Perfect Roommate',
    subtitle: 'Connect with people who match your vibe and lifestyle',
    type: 'roommate',
  },
  {
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1920&q=80',
    title: 'Discover Your Dream Room',
    subtitle: 'Browse hundreds of verified rooms in your area',
    type: 'room',
  },
  {
    image: '/images/promo/Roommate-Finder.webp',
    fallback: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1920&q=80',
    title: 'Live With Like-Minded People',
    subtitle: 'Find roommates who share your interests and values',
    type: 'roommate',
  },
  {
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1920&q=80',
    title: 'Your Next Home Awaits',
    subtitle: 'Quality rooms at prices that work for you',
    type: 'room',
  },
];

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import SearchFilters from '../components/SearchFilters';
import InterestedUsersPreview from '../components/InterestedUsersPreview';
import ListingLikeButton from '../components/ListingLikeButton';
import api from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import useListingInteractionStore from '@/stores/listingInteractionStore';
import useAuthStore from '@/stores/authStore';

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
  const { t } = useTranslation('listings');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { user } = useAuthStore();
  const { fetchBatchInterestedUsers, fetchMyLikedListings, getInterestedUsers } = useListingInteractionStore();

  // Rotate hero slides every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Get current slide content
  const currentSlide = HERO_SLIDES[currentImageIndex];

  const { data: rawListings, isLoading, error } = useQuery({
    queryKey: ['listings', searchQuery, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      params.append('sort', sortBy);
      const response = await api.get(`/listings/?${params.toString()}`);
      return response.data;
    },
  });

  // Apply client-side filters
  const listings = useMemo(() => {
    // Handle both array response and object response {listings: [...]}
    const listingsArray = Array.isArray(rawListings)
      ? rawListings
      : rawListings?.listings || [];

    if (!listingsArray.length) return [];

    return listingsArray.filter((listing) => {
      // Price filter
      if (filters.minPrice > 0 && listing.price < filters.minPrice) return false;
      if (filters.maxPrice < 10000 && listing.price > filters.maxPrice) return false;

      // Size filter
      if (filters.minSize > 0 && listing.size < filters.minSize) return false;
      if (filters.maxSize < 200 && listing.size > filters.maxSize) return false;

      // Room type filter
      if (filters.roomTypes?.length > 0 && !filters.roomTypes.includes(listing.roomType)) {
        return false;
      }

      // Building type filter
      if (filters.buildingTypes?.length > 0 && !filters.buildingTypes.includes(listing.buildingType)) {
        return false;
      }

      // Rent for filter
      if (filters.rentFor?.length > 0) {
        const listingRentFor = listing.rentForOnly || [];
        const hasMatch = filters.rentFor.some((r) => listingRentFor.includes(r));
        if (!hasMatch && !listingRentFor.includes('Open to All')) return false;
      }

      // Max tenants filter
      if (filters.maxTenants && listing.maxTenants > filters.maxTenants) {
        return false;
      }

      return true;
    });
  }, [rawListings, filters]);

  // Batch fetch interested users and liked listings when user is logged in and listings are loaded
  useEffect(() => {
    if (user && listings && listings.length > 0) {
      const listingIds = listings.map(l => l._id || l.id).filter(Boolean);
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
              index === currentImageIndex ? "opacity-100" : "opacity-0"
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
              {currentSlide.title}
            </h1>
            <p className="text-sm md:text-base text-white/80 mb-4 transition-all duration-500">
              {currentSlide.subtitle}
            </p>

            {/* Search Bar */}
            <div className="flex gap-2 bg-white/10 backdrop-blur-md rounded-lg p-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <Input
                  placeholder={t('search.placeholder')}
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

          {/* Bottom - Small Action Buttons */}
          {!user && (
            <div className="flex flex-wrap gap-2 mt-4">
              {/* Find Roommates Button */}
              <Link to="/matches">
                <Button
                  size="sm"
                  className="h-8 px-3 bg-teal-500 hover:bg-teal-600 text-white text-xs font-medium gap-1.5"
                >
                  <Users className="h-3.5 w-3.5" />
                  Find Roommates
                </Button>
              </Link>

              {/* List Property Button */}
              <Link to="/landlord/listings/new">
                <Button
                  size="sm"
                  className="h-8 px-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium gap-1.5"
                >
                  <Home className="h-3.5 w-3.5" />
                  List Property
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
                  ? slide.type === 'roommate' ? "bg-teal-400 w-4" : "bg-white w-4"
                  : "bg-white/50 hover:bg-white/70"
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
            {listings?.length || 0} {t('results.count')}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-auto sm:min-w-[160px]">
              <SelectValue placeholder={t('search.sort')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t('search.sortOptions.newest')}</SelectItem>
              <SelectItem value="price_asc">{t('search.sortOptions.priceAsc')}</SelectItem>
              <SelectItem value="price_desc">{t('search.sortOptions.priceDesc')}</SelectItem>
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
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">{t('error.title')}</h3>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {error.message || t('error.loadingFailed')}
            </p>
            <Button variant="outline" className="mt-4 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50">
              {t('error.retry')}
            </Button>
          </CardHeader>
        </Card>
      ) : listings?.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center py-16">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Home className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">{t('empty.title')}</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">{t('empty.subtitle')}</p>
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
  const { t, i18n } = useTranslation('listings');

  const getLocalizedText = (field) => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[i18n.language] || field.en || field.pl || '';
  };

  const listingId = listing._id || listing.id;

  return (
    <Card className="group overflow-hidden border-border hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      {/* Image Container */}
      <div className="relative h-52 overflow-hidden bg-muted">
        <img
          src={listing.images?.[0] || listing.photos?.[0]?.url || '/placeholder-room.jpg'}
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
              {t('card.available')}
            </Badge>
          )}
        </div>

        {/* Price Badge */}
        <div className="absolute bottom-3 right-3">
          <div className="bg-background/95 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-lg">
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(listing.price || listing.rent)}
            </p>
            <p className="text-xs text-muted-foreground text-right">{t('card.perMonth')}</p>
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
          <span className="text-sm truncate">{listing.location || listing.address}</span>
        </div>

        <Separator className="my-4" />

        {/* Room Details */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {listing.roomType && (
            <Badge variant="outline" className="font-normal">
              {listing.roomType}
            </Badge>
          )}
          {listing.size && (
            <span>{listing.size}m²</span>
          )}
          {listing.maxTenants && (
            <span>{listing.maxTenants} tenant{listing.maxTenants > 1 ? 's' : ''}</span>
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
              <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
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
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white group/btn"
          >
            {t('card.viewDetails')}
            <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

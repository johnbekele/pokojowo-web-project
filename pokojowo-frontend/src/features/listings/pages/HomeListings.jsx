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

// Promo sections with images
const PROMO_SECTIONS = [
  {
    id: 'roommates',
    image: '/images/promo/roomate1.webp',
    fallbackImage: '/images/promo/Roommate-Finder.webp',
    title: 'Find Your Vibe',
    subtitle: 'Match with roommates who get you. Same energy, same lifestyle.',
    ctaText: 'Find Roommates',
    ctaLink: '/matches',
    color: 'teal',
  },
  {
    id: 'rooms',
    image: '/images/promo/apartment-hotels.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1920&q=80',
    title: 'Score Your Space',
    subtitle: 'Discover rooms that fit your budget and your vibe. No cap.',
    ctaText: 'Browse Rooms',
    ctaLink: '#listings',
    color: 'blue',
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
  const [activePromo, setActivePromo] = useState(0);
  const { user } = useAuthStore();
  const { fetchBatchInterestedUsers, fetchMyLikedListings, getInterestedUsers } = useListingInteractionStore();

  // Auto-switch promo sections every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePromo((prev) => (prev + 1) % PROMO_SECTIONS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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
      {/* Hero Section with Promo Cards */}
      <div className="space-y-4">
        {/* Main Search Bar */}
        <div className="flex gap-2 bg-card border border-border rounded-xl p-3 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-sm"
            />
          </div>
          <Button size="sm" className="h-10 px-4">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>

        {/* Promo Cards Grid */}
        {!user && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PROMO_SECTIONS.map((promo, index) => {
              const isActive = activePromo === index;
              const colorClasses = promo.color === 'teal'
                ? 'from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700'
                : 'from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700';

              return (
                <Link
                  key={promo.id}
                  to={promo.ctaLink}
                  className="group relative overflow-hidden rounded-xl h-[180px] md:h-[200px] cursor-pointer"
                  onMouseEnter={() => setActivePromo(index)}
                >
                  {/* Background Image */}
                  <img
                    src={promo.image}
                    alt={promo.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => { e.target.src = promo.fallbackImage; }}
                  />

                  {/* Gradient Overlay */}
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-t opacity-80 group-hover:opacity-90 transition-opacity",
                    colorClasses
                  )} />

                  {/* Content */}
                  <div className="relative z-10 h-full p-4 flex flex-col justify-end text-white">
                    <div className={cn(
                      "transform transition-all duration-300",
                      isActive ? "translate-y-0" : "translate-y-2"
                    )}>
                      <h3 className="text-lg md:text-xl font-bold mb-1">
                        {promo.title}
                      </h3>
                      <p className="text-xs md:text-sm text-white/90 mb-3 line-clamp-2">
                        {promo.subtitle}
                      </p>
                      <Button
                        size="sm"
                        className="h-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white text-xs font-medium"
                      >
                        {promo.color === 'teal' ? (
                          <Users className="h-3.5 w-3.5 mr-1.5" />
                        ) : (
                          <Home className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        {promo.ctaText}
                        <ArrowRight className="h-3 w-3 ml-1.5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>

                  {/* Active Indicator */}
                  <div className={cn(
                    "absolute top-3 right-3 w-2 h-2 rounded-full transition-all",
                    isActive ? "bg-white scale-100" : "bg-white/50 scale-75"
                  )} />
                </Link>
              );
            })}
          </div>
        )}

        {/* Landlord CTA - Small Banner */}
        {!user && (
          <Link to="/landlord/listings/new" className="block">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Home className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Got a room to rent?</p>
                  <p className="text-xs text-muted-foreground">List it free & find your perfect tenant</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs border-amber-500/50 text-amber-600 hover:bg-amber-500/10">
                List Property
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </Link>
        )}
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

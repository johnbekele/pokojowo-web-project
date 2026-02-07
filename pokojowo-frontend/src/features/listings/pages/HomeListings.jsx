import { useState, useMemo, useEffect } from 'react';
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
  ChevronRight
} from 'lucide-react';
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
  const { user } = useAuthStore();
  const { fetchBatchInterestedUsers, fetchMyLikedListings, getInterestedUsers } = useListingInteractionStore();

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
      {/* Hero Section */}
      <div className="rounded-2xl bg-primary p-4 sm:p-6 md:p-8 lg:p-12 text-primary-foreground">
        <div className="max-w-2xl">
          <span className="text-sm font-medium text-primary-foreground/70 mb-3 md:mb-4 block">{t('hero.badge')}</span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">
            {t('title')}
          </h1>
          <p className="text-base md:text-lg text-primary-foreground/80 mb-6 md:mb-8 max-w-xl">
            {t('hero.subtitle')}
          </p>

          {/* Search Bar in Hero */}
          <div className="flex flex-col sm:flex-row gap-3 bg-primary-foreground/10 rounded-xl p-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary-foreground/50" />
              <Input
                placeholder={t('search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
              />
            </div>
            <Button size="lg" variant="secondary" className="h-12 font-semibold">
              <Search className="h-5 w-5 mr-2" />
              {t('hero.searchButton')}
            </Button>
          </div>
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

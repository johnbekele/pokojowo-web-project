import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MapPin, Calendar, MessageSquare, ArrowLeft, Check, Home, Bed, Bath } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import UserAvatar from '@/components/shared/UserAvatar';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

// Helper to get translated text from multilingual object
const getTranslatedText = (text, lang) => {
  if (!text) return '';
  if (typeof text === 'string') return text;
  if (typeof text === 'object') {
    return text[lang] || text.en || text.pl || '';
  }
  return String(text);
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
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-96 w-full rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-destructive">Listing Not Found</CardTitle>
          <CardDescription>
            This listing may have been removed or doesn't exist.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link to="/">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Listings
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const landlord = listing.landlord || listing.owner;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to listings
      </Link>

      {/* Image Gallery */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {listing.photos?.length > 0 ? (
          <>
            <div className="md:col-span-2 lg:row-span-2">
              <img
                src={listing.photos[0].url}
                alt={listing.title}
                className="h-full w-full rounded-lg object-cover"
                style={{ minHeight: '400px' }}
              />
            </div>
            {listing.photos.slice(1, 5).map((photo, index) => (
              <div key={index}>
                <img
                  src={photo.url}
                  alt={`${listing.title} ${index + 2}`}
                  className="h-48 w-full rounded-lg object-cover"
                />
              </div>
            ))}
          </>
        ) : (
          <div className="col-span-full h-96 rounded-lg bg-muted flex items-center justify-center">
            <Home className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title and Price */}
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold md:text-3xl">{listing.title}</h1>
                <p className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {listing.address?.street}, {listing.address?.city}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(listing.price || listing.rent)}
                </p>
                <p className="text-sm text-muted-foreground">{t('card.perMonth')}</p>
              </div>
            </div>

            {listing.available && (
              <Badge className="mt-2 bg-green-500">Available Now</Badge>
            )}
          </div>

          {/* Quick Info */}
          <div className="flex flex-wrap gap-4">
            {listing.roomType && (
              <div className="flex items-center gap-2">
                <Bed className="h-5 w-5 text-muted-foreground" />
                <span className="capitalize">{listing.roomType.replace('_', ' ')}</span>
              </div>
            )}
            {listing.bathrooms && (
              <div className="flex items-center gap-2">
                <Bath className="h-5 w-5 text-muted-foreground" />
                <span>{listing.bathrooms} {listing.bathrooms === 1 ? 'Bathroom' : 'Bathrooms'}</span>
              </div>
            )}
            {listing.availableFrom && (
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span>Available from {formatDate(listing.availableFrom)}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h2 className="text-lg font-semibold mb-2">{t('details.description')}</h2>
            <p className="text-muted-foreground whitespace-pre-line">
              {getTranslatedText(listing.description, currentLang)}
            </p>
          </div>

          {/* Amenities */}
          {listing.amenities?.length > 0 && (
            <>
              <Separator />
              <div>
                <h2 className="text-lg font-semibold mb-3">{t('details.amenities')}</h2>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {listing.amenities.map((amenity) => (
                    <div key={amenity} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Additional Details */}
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            {listing.deposit && (
              <div>
                <p className="text-sm text-muted-foreground">{t('details.deposit')}</p>
                <p className="font-medium">{formatCurrency(listing.deposit)}</p>
              </div>
            )}
            {listing.utilitiesIncluded !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground">{t('details.utilities')}</p>
                <p className="font-medium">
                  {listing.utilitiesIncluded
                    ? t('details.utilitiesIncluded')
                    : t('details.utilitiesExtra')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Landlord Info */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg">{t('details.landlord')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {landlord ? (
                <>
                  <div className="flex items-center gap-3">
                    <UserAvatar user={landlord} size="lg" />
                    <div>
                      <p className="font-medium">
                        {landlord.firstname} {landlord.lastname}
                      </p>
                      {landlord.isVerified && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <Button className="w-full">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {t('details.contactLandlord')}
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Landlord information not available
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

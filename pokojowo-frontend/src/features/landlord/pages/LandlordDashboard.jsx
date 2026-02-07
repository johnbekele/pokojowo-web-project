import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Plus, Home, Eye, MessageSquare, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import useAuthStore from '@/stores/authStore';

export default function LandlordDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Fetch landlord's listings
  const { data: listings, isLoading } = useQuery({
    queryKey: ['my-listings', user?.id],
    queryFn: async () => {
      const response = await api.get(`/listings/owner/${user.id}`);
      return response.data;
    },
    enabled: !!user?.id,
  });

  const stats = [
    {
      title: 'Total Listings',
      value: listings?.length || 0,
      icon: Home,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Active Listings',
      value: listings?.filter(l => new Date(l.availableFrom) <= new Date()).length || 0,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: 'Total Views',
      value: '—',
      icon: Eye,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      title: 'Messages',
      value: '—',
      icon: MessageSquare,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
  ];

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Landlord Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your property listings
          </p>
        </div>
        <Button onClick={() => navigate('/landlord/listings/new')} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Add New Listing
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Listings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Your Listings</CardTitle>
            <CardDescription>
              Manage and monitor your property listings
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => navigate('/landlord/listings')}>
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-16 w-24 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : listings?.length === 0 ? (
            <div className="text-center py-12">
              <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No listings yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding your first property listing
              </p>
              <Button onClick={() => navigate('/landlord/listings/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Listing
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {listings?.slice(0, 5).map((listing) => (
                <div
                  key={listing._id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/landlord/listings/${listing._id}/edit`)}
                >
                  <div className="h-16 w-24 rounded overflow-hidden bg-muted">
                    {listing.images?.[0] ? (
                      <img
                        src={listing.images[0]}
                        alt={listing.address}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Home className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{listing.address}</h4>
                    <p className="text-sm text-muted-foreground">
                      {listing.roomType} • {listing.size}m² • {listing.price} PLN/month
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">Active</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(listing.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Home,
  Edit,
  Trash2,
  MoreVertical,
  Eye,
  Calendar,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/useToast';
import api from '@/lib/api';
import useAuthStore from '@/stores/authStore';

export default function MyListings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState(null);

  // Fetch landlord's listings
  const { data: listings, isLoading } = useQuery({
    queryKey: ['my-listings', user?.id],
    queryFn: async () => {
      const response = await api.get(`/listings/owner/${user.id}`);
      return response.data;
    },
    enabled: !!user?.id,
  });

  // Delete listing mutation
  const deleteMutation = useMutation({
    mutationFn: async (listingId) => {
      await api.delete(`/listings/${listingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-listings']);
      toast({
        title: 'Listing Deleted',
        description: 'Your listing has been removed successfully.',
      });
      setDeleteDialogOpen(false);
      setListingToDelete(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to delete listing',
        variant: 'destructive',
      });
    },
  });

  const handleDelete = (listing) => {
    setListingToDelete(listing);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (listingToDelete) {
      deleteMutation.mutate(listingToDelete._id);
    }
  };

  const getStatusBadge = (listing) => {
    const availableDate = new Date(listing.availableFrom);
    const now = new Date();

    if (availableDate <= now) {
      return <Badge className="bg-green-500">Available</Badge>;
    } else {
      return <Badge variant="secondary">Coming Soon</Badge>;
    }
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/landlord/dashboard')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">My Listings</h1>
            <p className="text-muted-foreground">
              {listings?.length || 0} listing{listings?.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button onClick={() => navigate('/landlord/listings/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Listing
        </Button>
      </div>

      {/* Listings Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : listings?.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Home className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No listings yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              You haven't created any property listings yet. Start by adding your first listing to reach potential tenants.
            </p>
            <Button onClick={() => navigate('/landlord/listings/new')} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Create Your First Listing
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <Card key={listing._id} className="overflow-hidden group">
              {/* Image */}
              <div className="relative h-48 bg-muted">
                {listing.images?.[0] ? (
                  <img
                    src={listing.images[0]}
                    alt={listing.address}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Home className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                {/* Status Badge */}
                <div className="absolute top-3 left-3">
                  {getStatusBadge(listing)}
                </div>
                {/* Actions Menu */}
                <div className="absolute top-3 right-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/listing/${listing._id}`)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/landlord/listings/${listing._id}/edit`)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDelete(listing)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Content */}
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-1 truncate">
                  {listing.address}
                </h3>
                <p className="text-2xl font-bold text-primary mb-2">
                  {listing.price} PLN
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </p>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mb-3">
                  <span>{listing.roomType}</span>
                  <span>•</span>
                  <span>{listing.size}m²</span>
                  <span>•</span>
                  <span>{listing.maxTenants} tenant{listing.maxTenants > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-1" />
                  Available from {new Date(listing.availableFrom).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{listingToDelete?.address}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

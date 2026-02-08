"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ListingReviewCard } from "./ListingReviewCard";
import { ListingEditModal } from "./ListingEditModal";
import {
  usePendingListings,
  useApproveListing,
  useRejectListing,
  useBulkApprove,
  useBulkReject,
  useQueueStats,
} from "../hooks/useScraperDashboard";
import { useToast } from "@/hooks/useToast";

const ITEMS_PER_PAGE = 12;

export function ApprovalQueue() {
  const [filters, setFilters] = useState({
    status: "pending",
    site: "",
    sortBy: "created_at",
    sortOrder: "desc",
  });
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedListings, setSelectedListings] = useState(new Set());
  const [editingListing, setEditingListing] = useState(null);

  const { toast } = useToast();

  const { data, isLoading, refetch } = usePendingListings({
    ...filters,
    limit: ITEMS_PER_PAGE,
    offset: page * ITEMS_PER_PAGE,
    site: filters.site || undefined,
  });

  const { data: queueStats } = useQueueStats();

  const approveMutation = useApproveListing();
  const rejectMutation = useRejectListing();
  const bulkApproveMutation = useBulkApprove();
  const bulkRejectMutation = useBulkReject();

  const listings = data?.listings || [];
  const total = data?.total || 0;
  const statusCounts = data?.status_counts || queueStats?.status_counts || {};
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const filteredListings = useMemo(() => {
    if (!searchQuery) return listings;
    const query = searchQuery.toLowerCase();
    return listings.filter(
      (l) =>
        l.original?.title?.toLowerCase().includes(query) ||
        l.original?.address?.toLowerCase().includes(query) ||
        l.processed?.address?.toLowerCase().includes(query)
    );
  }, [listings, searchQuery]);

  const handleSelectAll = () => {
    if (selectedListings.size === filteredListings.length) {
      setSelectedListings(new Set());
    } else {
      setSelectedListings(new Set(filteredListings.map((l) => l._id)));
    }
  };

  const handleSelect = (id) => {
    setSelectedListings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleApprove = async (listingId) => {
    try {
      await approveMutation.mutateAsync({ listingId });
      toast({
        title: "Listing approved",
        description: "The listing has been approved and will be published.",
      });
      setSelectedListings((prev) => {
        const next = new Set(prev);
        next.delete(listingId);
        return next;
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve listing",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (listingId, reason) => {
    try {
      await rejectMutation.mutateAsync({ listingId, reason });
      toast({
        title: "Listing rejected",
        description: "The listing has been rejected.",
      });
      setSelectedListings((prev) => {
        const next = new Set(prev);
        next.delete(listingId);
        return next;
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject listing",
        variant: "destructive",
      });
    }
  };

  const handleBulkApprove = async () => {
    if (selectedListings.size === 0) return;
    try {
      await bulkApproveMutation.mutateAsync({
        listingIds: Array.from(selectedListings),
      });
      toast({
        title: "Listings approved",
        description: `${selectedListings.size} listings have been approved.`,
      });
      setSelectedListings(new Set());
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve listings",
        variant: "destructive",
      });
    }
  };

  const handleBulkReject = async () => {
    if (selectedListings.size === 0) return;
    try {
      await bulkRejectMutation.mutateAsync({
        listingIds: Array.from(selectedListings),
        reason: "Bulk rejection",
      });
      toast({
        title: "Listings rejected",
        description: `${selectedListings.size} listings have been rejected.`,
      });
      setSelectedListings(new Set());
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject listings",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Approval Queue</CardTitle>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { key: "pending", label: "Pending", count: statusCounts.pending },
              { key: "edited", label: "Edited", count: statusCounts.edited },
              { key: "approved", label: "Approved", count: statusCounts.approved },
              { key: "rejected", label: "Rejected", count: statusCounts.rejected },
            ].map((tab) => (
              <Button
                key={tab.key}
                variant={filters.status === tab.key ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, status: tab.key }));
                  setPage(0);
                }}
              >
                {tab.label}
                <Badge variant="secondary" className="ml-2">
                  {tab.count || 0}
                </Badge>
              </Button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search listings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select
              value={filters.site}
              onValueChange={(value) => {
                setFilters((prev) => ({ ...prev, site: value === "all" ? "" : value }));
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                <SelectItem value="olx">OLX</SelectItem>
                <SelectItem value="otodom">Otodom</SelectItem>
                <SelectItem value="gumtree">Gumtree</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.sortOrder}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, sortOrder: value }))}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest First</SelectItem>
                <SelectItem value="asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedListings.size > 0 && (
            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg mb-4">
              <Checkbox
                checked={selectedListings.size === filteredListings.length}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium">
                {selectedListings.size} selected
              </span>
              <div className="flex-1" />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject Selected
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reject {selectedListings.size} listings?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will reject all selected listings. They will not be published.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkReject}>
                      Reject All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button size="sm" onClick={handleBulkApprove}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve Selected
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Listings Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-[400px]" />
            </Card>
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No listings found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {filters.status === "pending"
                ? "All caught up! No pending listings to review."
                : `No ${filters.status} listings found.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredListings.map((listing) => (
              <ListingReviewCard
                key={listing._id}
                listing={listing}
                isSelected={selectedListings.has(listing._id)}
                onSelect={handleSelect}
                onApprove={handleApprove}
                onReject={handleReject}
                onEdit={setEditingListing}
                isApproving={approveMutation.isPending}
                isRejecting={rejectMutation.isPending}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      <ListingEditModal
        listing={editingListing}
        open={!!editingListing}
        onOpenChange={(open) => !open && setEditingListing(null)}
        onSaved={() => refetch()}
      />
    </div>
  );
}

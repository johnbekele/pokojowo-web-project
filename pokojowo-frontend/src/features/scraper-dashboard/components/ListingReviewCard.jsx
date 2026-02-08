"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  XCircle,
  Edit,
  ExternalLink,
  MapPin,
  Home,
  Users,
  ImageIcon,
  AlertTriangle,
} from "lucide-react";

export function ListingReviewCard({
  listing,
  isSelected,
  onSelect,
  onApprove,
  onReject,
  onEdit,
  isApproving,
  isRejecting,
}) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const original = listing.original || {};
  const processed = listing.processed || {};
  const quality = listing.quality || {};

  const handleReject = () => {
    onReject(listing._id, rejectionReason);
    setRejectDialogOpen(false);
    setRejectionReason("");
  };

  const getSiteColor = (site) => {
    const colors = {
      olx: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      otodom: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      gumtree: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    };
    return colors[site] || "bg-gray-100 text-gray-800";
  };

  const getConfidenceBadge = (confidence) => {
    if (confidence === "high") {
      return <Badge variant="outline" className="text-green-600 border-green-600">High</Badge>;
    } else if (confidence === "medium") {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Medium</Badge>;
    }
    return <Badge variant="outline" className="text-red-600 border-red-600">Low</Badge>;
  };

  return (
    <Card className={`transition-all ${isSelected ? "ring-2 ring-primary" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelect(listing._id)}
            />
            <Badge className={getSiteColor(listing.source_site)}>
              {listing.source_site?.toUpperCase()}
            </Badge>
            {listing.status === "edited" && (
              <Badge variant="secondary">Edited</Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <ImageIcon className="h-3 w-3" />
            {quality.image_count || 0}
          </div>
        </div>
        <h3 className="font-semibold mt-2 line-clamp-2">{original.title}</h3>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Price and Location */}
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary">
            {processed.price?.toLocaleString()} PLN
          </span>
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {original.city}
          </div>
        </div>

        {/* Address */}
        <p className="text-sm text-muted-foreground line-clamp-1">
          {processed.address || original.address}
        </p>

        {/* Properties */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Home className="h-3 w-3" />
            {processed.size || "?"} m²
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {processed.max_tenants || 2} tenants
          </Badge>
          <Badge variant="outline">{processed.room_type}</Badge>
          <Badge variant="outline">{processed.building_type?.replace("_", " ")}</Badge>
        </div>

        {/* Preview Image */}
        {original.image_urls?.[0] && (
          <div className="aspect-video rounded-md overflow-hidden bg-muted">
            <img
              src={original.image_urls[0]}
              alt="Listing preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>
        )}

        {/* Quality Indicators */}
        <div className="flex flex-wrap gap-2 text-xs">
          {!quality.has_images && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              No images
            </Badge>
          )}
          {!quality.has_size && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              Size estimated
            </Badge>
          )}
          <span className="flex items-center gap-1">
            Room: {getConfidenceBadge(quality.room_type_confidence)}
          </span>
          <span className="flex items-center gap-1">
            Building: {getConfidenceBadge(quality.building_type_confidence)}
          </span>
        </div>

        {/* Descriptions Preview */}
        <div className="space-y-2">
          <div>
            <span className="text-xs font-medium text-muted-foreground">English:</span>
            <p className="text-sm line-clamp-2">{processed.description_en}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-muted-foreground">Polish:</span>
            <p className="text-sm line-clamp-2">{processed.description_pl}</p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between gap-2 pt-4">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(listing)}
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            asChild
          >
            <a href={listing.source_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" />
              Source
            </a>
          </Button>
        </div>

        <div className="flex gap-2">
          <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
                disabled={isRejecting}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Listing</DialogTitle>
                <DialogDescription>
                  Please provide a reason for rejecting this listing.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Rejection reason (optional)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleReject}>
                  Reject
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            size="sm"
            onClick={() => onApprove(listing._id)}
            disabled={isApproving}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

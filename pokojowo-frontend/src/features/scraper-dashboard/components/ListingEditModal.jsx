"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Save, X, ImageIcon } from "lucide-react";
import { useUpdatePendingListing } from "../hooks/useScraperDashboard";

const ROOM_TYPES = ["Single", "Double", "Suite"];
const BUILDING_TYPES = ["Apartment", "Loft", "Block", "Detached_House"];
const RENT_FOR_OPTIONS = ["Women", "Man", "Family", "Couple", "Local", "Student", "Open to All"];

export function ListingEditModal({ listing, open, onOpenChange, onSaved }) {
  const [formData, setFormData] = useState({
    description_en: "",
    description_pl: "",
    price: 0,
    address: "",
    size: 0,
    room_type: "Double",
    building_type: "Apartment",
    rent_for_only: ["Open to All"],
    max_tenants: 2,
  });

  const updateMutation = useUpdatePendingListing();

  useEffect(() => {
    if (listing?.processed) {
      setFormData({
        description_en: listing.processed.description_en || "",
        description_pl: listing.processed.description_pl || "",
        price: listing.processed.price || 0,
        address: listing.processed.address || "",
        size: listing.processed.size || 0,
        room_type: listing.processed.room_type || "Double",
        building_type: listing.processed.building_type || "Apartment",
        rent_for_only: listing.processed.rent_for_only || ["Open to All"],
        max_tenants: listing.processed.max_tenants || 2,
      });
    }
  }, [listing]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRentForToggle = (option) => {
    setFormData((prev) => {
      const current = prev.rent_for_only || [];
      if (current.includes(option)) {
        return { ...prev, rent_for_only: current.filter((o) => o !== option) };
      } else {
        return { ...prev, rent_for_only: [...current, option] };
      }
    });
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        listingId: listing._id,
        updates: formData,
      });
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update listing:", error);
    }
  };

  if (!listing) return null;

  const original = listing.original || {};
  const quality = listing.quality || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Listing
            <Badge variant="outline">{listing.source_site?.toUpperCase()}</Badge>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            Review and modify before publishing
            <a
              href={listing.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              View Original
            </a>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="descriptions">Descriptions</TabsTrigger>
              <TabsTrigger value="images">Images ({quality.image_count || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (PLN/month)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange("price", parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Original: {original.price?.toLocaleString()} PLN
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="size">Size (m²)</Label>
                  <Input
                    id="size"
                    type="number"
                    value={formData.size}
                    onChange={(e) => handleInputChange("size", parseFloat(e.target.value) || 0)}
                  />
                  {!quality.has_size && (
                    <p className="text-xs text-yellow-600">Estimated value</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Original: {original.address}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Room Type</Label>
                  <Select
                    value={formData.room_type}
                    onValueChange={(value) => handleInputChange("room_type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Confidence: {quality.room_type_confidence || "unknown"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Building Type</Label>
                  <Select
                    value={formData.building_type}
                    onValueChange={(value) => handleInputChange("building_type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUILDING_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Confidence: {quality.building_type_confidence || "unknown"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_tenants">Max Tenants</Label>
                <Input
                  id="max_tenants"
                  type="number"
                  min={1}
                  max={10}
                  value={formData.max_tenants}
                  onChange={(e) => handleInputChange("max_tenants", parseInt(e.target.value) || 2)}
                />
              </div>

              <div className="space-y-2">
                <Label>Rent For</Label>
                <div className="flex flex-wrap gap-2">
                  {RENT_FOR_OPTIONS.map((option) => (
                    <Badge
                      key={option}
                      variant={formData.rent_for_only?.includes(option) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleRentForToggle(option)}
                    >
                      {option}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="descriptions" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="description_en">English Description</Label>
                <Textarea
                  id="description_en"
                  rows={6}
                  value={formData.description_en}
                  onChange={(e) => handleInputChange("description_en", e.target.value)}
                  placeholder="Enter English description..."
                />
                <p className="text-xs text-muted-foreground">
                  {formData.description_en?.length || 0} characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description_pl">Polish Description (Original)</Label>
                <Textarea
                  id="description_pl"
                  rows={6}
                  value={formData.description_pl}
                  onChange={(e) => handleInputChange("description_pl", e.target.value)}
                  placeholder="Enter Polish description..."
                />
                <p className="text-xs text-muted-foreground">
                  {formData.description_pl?.length || 0} characters
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-medium mb-2">Original Title</h4>
                <p className="text-sm">{original.title}</p>
              </div>
            </TabsContent>

            <TabsContent value="images" className="mt-4">
              {original.image_urls?.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {original.image_urls.map((url, index) => (
                    <div
                      key={index}
                      className="aspect-video rounded-lg overflow-hidden bg-muted"
                    >
                      <img
                        src={url}
                        alt={`Listing image ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = "/placeholder-image.jpg";
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mb-2" />
                  <p>No images available</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-1" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

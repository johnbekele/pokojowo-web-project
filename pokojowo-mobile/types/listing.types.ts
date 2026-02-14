export interface Listing {
  id: string;
  _id?: string; // MongoDB returns _id
  owner_id: string;
  address: string;
  price: number;
  size?: number;
  max_tenants?: number;
  images: string[];
  description: {
    en?: string;
    pl?: string;
  };
  available_from?: string;
  room_type?: 'Single' | 'Double' | 'Suite' | 'private' | 'shared' | 'studio';
  building_type?: 'Apartment' | 'Loft' | 'Block' | 'Detached_House' | 'house';
  rent_for?: string;
  rent_for_only?: string;
  can_be_contacted?: string[];
  close_to?: string[];
  ai_help?: boolean;
  created_at: string;
  updated_at?: string;
  is_active?: boolean;
  floor?: number;
  amenities?: string[];
  deposit?: number;
  utilities_included?: boolean;
  min_lease?: number;
  owner?: {
    id: string;
    username: string;
    firstname?: string;
    lastname?: string;
    photo?: string;
    phone?: string;
    is_verified?: boolean;
  };
  landlord?: {
    id: string;
    username: string;
    firstname?: string;
    lastname?: string;
    photo?: string;
    phone?: string;
    isVerified?: boolean;
  };
  phone?: string; // Direct phone on listing
}

export interface ListingFilters {
  search?: string;
  min_price?: number;
  max_price?: number;
  min_size?: number;
  max_size?: number;
  room_type?: string;
  room_types?: string[];
  building_type?: string;
  building_types?: string[];
  rent_for?: string[];
  max_tenants?: number;
  available_from?: string;
  sort_by?: 'price' | 'created_at' | 'size';
  sort_order?: 'asc' | 'desc';
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc';
}

export interface CreateListingData {
  address: string;
  price: number;
  size?: number;
  max_tenants?: number;
  images?: string[];
  description?: {
    en?: string;
    pl?: string;
  };
  available_from?: string;
  room_type?: string;
  building_type?: string;
  rent_for?: string;
  rent_for_only?: string;
  can_be_contacted?: string[];
  close_to?: string[];
  floor?: number;
  amenities?: string[];
  deposit?: number;
  utilities_included?: boolean;
  min_lease?: number;
}

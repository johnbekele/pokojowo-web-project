export interface Listing {
  id: string;
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
    is_verified?: boolean;
  };
}

export interface ListingFilters {
  search?: string;
  min_price?: number;
  max_price?: number;
  room_type?: string;
  building_type?: string;
  available_from?: string;
  sort_by?: 'price' | 'created_at' | 'size';
  sort_order?: 'asc' | 'desc';
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

/** Mirrors the backend's lean() JSON shapes — see src/models on the Express side. */

export interface ProductPricing {
  marketAnchorPrice: number;
  baseWholesaleCost: number;
  maxSquadDiscount: number;
  currentRetailPrice: number;
}

export interface Product {
  _id: string;
  title: string;
  slug: string;
  description: string;
  images: string[];
  category: string;
  pricing: ProductPricing;
  dualCheckoutEnabled: boolean;
  maxSquadMembers: number;
  isActive: boolean;
  createdAt: string;
}

export interface SquadProductSummary {
  _id: string;
  title: string;
  slug: string;
  images: string[];
  category: string;
  pricing: ProductPricing;
}

export interface Squad {
  _id: string;
  productId: SquadProductSummary;
  targetMembers: number;
  currentMembers: number;
  expiresAt: string;
  status: "Gathering" | "Voting" | "Captured" | "Voided";
}

export interface Category {
  name: string;
  productCount: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AuthUser {
  id: string;
  phoneNumber: string;
  name: string;
  role: "Buyer" | "Supplier" | "Admin";
}

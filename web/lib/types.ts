/** Mirrors the backend's lean() JSON shapes — see src/models on the Express side. */

export interface ProductPricing {
  marketAnchorPrice: number;
  baseWholesaleCost: number;
  maxSquadDiscount: number;
  currentRetailPrice: number;
}

export type ProductApprovalStatus = "Pending" | "Approved" | "Rejected";

export interface Product {
  _id: string;
  title: string;
  slug: string;
  description: string;
  images: string[];
  category: string;
  deposit_percentage: number;
  pricing: ProductPricing;
  dualCheckoutEnabled: boolean;
  maxSquadMembers: number;
  isActive: boolean;
  approvalStatus?: ProductApprovalStatus;
  createdAt: string;
}

export interface SupplierSummary {
  _id: string;
  name: string;
  phoneNumber: string;
  supplierDetails?: { companyName?: string };
}

export interface SupplierApplication extends SupplierSummary {
  email?: string;
  verificationStatus: "Pending" | "Approved" | "Rejected";
  reviewNote?: string;
  dropshipNetworkId?: string;
  cnicNtn?: string;
  contactNumber?: string;
  createdAt: string;
}

export interface AdminProduct extends Product {
  supplierId: SupplierSummary & { email?: string; verificationStatus?: "Pending" | "Approved" | "Rejected" };
}

export interface PendingProduct extends Product {
  supplierId: SupplierSummary;
}

export interface SquadProductSummary {
  _id: string;
  title: string;
  slug: string;
  images: string[];
  category: string;
  pricing: ProductPricing;
}

export type SquadVote = "Proceed" | "OptOut";

export interface SquadMember {
  userId: string;
  joinedAt: string;
  depositTransactionId: string;
  vote?: SquadVote;
}

export type SquadStatus = "Gathering" | "Voting" | "Captured" | "Resolved" | "Failed";

export interface Squad {
  _id: string;
  productId: SquadProductSummary;
  targetMembers: number;
  currentMembers: number;
  members: SquadMember[];
  expiresAt: string;
  status: SquadStatus;
}

export type PurchaseType = "Squad" | "Standard";

export type LogisticsStatus =
  | "Pending_Dispatch"
  | "Packed"
  | "Shipped"
  | "Out_for_Delivery"
  | "Delivered"
  | "Cancelled"
  | "Returned";

export interface OrderTotals {
  unitPrice: number;
  quantity: number;
  discountRate: number;
  discountAmount: number;
  subtotal: number;
  shipping: number;
  platformFee: number;
  supplierPayout: number;
  total: number;
  depositPaid: number;
  codAmountDue: number;
}

export interface Order {
  _id: string;
  productId: SquadProductSummary;
  squadId?: string;
  purchaseType: PurchaseType;
  logisticsStatus: LogisticsStatus;
  totals: OrderTotals;
  trackingNumber?: string;
  courier?: string;
  deliveredAt?: string;
  createdAt: string;
}

/** A manifest row also carries the buyer's contact info for dispatch. */
export interface ManifestOrder extends Order {
  buyerId: { _id: string; phoneNumber: string; name: string };
}

export type DisputeIssueType =
  | "ProductQuality"
  | "WrongItem"
  | "DeliveryDelay"
  | "PaymentIssue"
  | "Other";

export type DisputeStatus = "Open" | "UnderReview" | "Resolved" | "Rejected" | "Refunded" | "Closed";

export interface Dispute {
  _id: string;
  orderId: { _id: string; purchaseType: PurchaseType; totals: OrderTotals; logisticsStatus: LogisticsStatus };
  buyerId: { _id: string; phoneNumber: string; name: string };
  supplierId: { _id: string; phoneNumber: string; name: string };
  issueType: DisputeIssueType;
  status: DisputeStatus;
  description: string;
  evidenceUrls: string[];
  resolutionNote?: string;
  createdAt: string;
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

export type UserRole = "Buyer" | "Supplier" | "Admin";

export interface ShippingAddress {
  fullName: string;
  phoneNumber: string;
  province: string;
  city: string;
  area: string;
  streetAddress: string;
  landmark?: string | null;
}

export interface AuthUser {
  id: string;
  phoneNumber: string;
  name: string;
  role: UserRole;
  verificationStatus?: "Unverified" | "Pending" | "Approved" | "Rejected";
  shippingAddress?: ShippingAddress | null;
}

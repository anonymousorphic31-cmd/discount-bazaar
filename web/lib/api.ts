import type {
  Category,
  Dispute,
  ManifestOrder,
  Order,
  Paginated,
  PendingProduct,
  Product,
  Squad,
  SquadVote,
  SupplierSummary,
} from "./types";

/**
 * Server Components (and any server-side code) talk to the Express API
 * directly over the loopback interface — fast, and never crosses the proxy.
 * The value is internal-only; it is not read by the browser.
 */
const INTERNAL_API_URL = process.env.BACKEND_INTERNAL_URL ?? "http://127.0.0.1:8000";

/**
 * Client Components must go through Next's own origin so the request stays
 * same-origin inside the preview's proxied iframe — see next.config.ts
 * rewrites, which forward `/api/*` to the Express server.
 */
function baseUrl(): string {
  return typeof window === "undefined" ? INTERNAL_API_URL : "";
}

interface ApiFetchOptions extends RequestInit {
  token?: string | null;
}

async function apiFetch<T>(path: string, { token, ...init }: ApiFetchOptions = {}): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    // Homepage catalog data changes whenever the admin publishes — never
    // serve a stale cached response.
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request to ${path} failed with ${res.status}`);
  }

  return (await res.json()) as T;
}

export async function fetchActiveSquads(limit = 10): Promise<Squad[]> {
  const result = await apiFetch<Paginated<Squad>>(`/api/squads?limit=${limit}`);
  return result.data;
}

export async function fetchCategories(): Promise<Category[]> {
  const result = await apiFetch<{ data: Category[] }>("/api/products/categories");
  return result.data;
}

export interface FetchProductsOptions {
  category?: string;
  limit?: number;
  page?: number;
  sort?: string;
}

export async function fetchProducts(options: FetchProductsOptions = {}): Promise<Paginated<Product>> {
  const params = new URLSearchParams();
  if (options.category) params.set("category", options.category);
  if (options.limit) params.set("limit", String(options.limit));
  if (options.page) params.set("page", String(options.page));
  if (options.sort) params.set("sort", options.sort);

  const query = params.toString();
  return apiFetch<Paginated<Product>>(`/api/products${query ? `?${query}` : ""}`);
}

export async function fetchProductById(id: string): Promise<Product> {
  const result = await apiFetch<{ data: Product }>(`/api/products/${id}`);
  return result.data;
}

/** Finds the current Gathering squad for a product, if one exists, so the PDP can show its live progress. */
export async function fetchActiveSquadForProduct(productId: string): Promise<Squad | null> {
  const squads = await fetchActiveSquads(50);
  return squads.find((squad) => squad.productId._id === productId) ?? null;
}

export interface EscrowCheckoutResult {
  trackerId: string;
  checkoutUrl: string;
  holdAmount: number;
  productId: string;
  squadId: string | null;
}

export async function initiateEscrowCheckout(
  productId: string,
  squadId: string | undefined,
  token: string,
): Promise<EscrowCheckoutResult> {
  const result = await apiFetch<{ data: EscrowCheckoutResult }>("/api/escrow/checkout", {
    method: "POST",
    token,
    body: JSON.stringify({ productId, squadId }),
  });
  return result.data;
}

/**
 * In production, Safepay calls this webhook once the buyer authorizes the
 * hold on their hosted checkout page. There is no real payment gateway wired
 * up yet (see src/utils/safepay.ts), so nothing will ever call this
 * automatically in this environment — the frontend fires it itself right
 * after checkout to reconcile squad membership, exactly like Safepay would.
 */
export async function simulateEscrowAuthorization(params: {
  trackerId: string;
  amount: number;
  productId: string;
  squadId: string | null;
  buyerId: string;
}): Promise<void> {
  await apiFetch("/api/escrow/webhook", {
    method: "POST",
    body: JSON.stringify({
      event: "authorization.success",
      data: {
        tracker_id: params.trackerId,
        amount: params.amount,
        metadata: {
          productId: params.productId,
          squadId: params.squadId ?? undefined,
          buyerId: params.buyerId,
        },
      },
    }),
  });
}

export async function fetchMySquads(token: string): Promise<Squad[]> {
  const result = await apiFetch<{ data: Squad[] }>("/api/squads/me", { token });
  return result.data;
}

export async function voteOnSquad(
  squadId: string,
  vote: SquadVote,
  token: string,
): Promise<{ squadId: string; vote: SquadVote; transactionState: string }> {
  const backendVote = vote === "OptOut" ? "Opt_Out" : "Proceed";
  const result = await apiFetch<{ data: { squadId: string; vote: SquadVote; transactionState: string } }>(
    `/api/squads/${squadId}/vote`,
    {
      method: "POST",
      token,
      body: JSON.stringify({ vote: backendVote }),
    },
  );
  return result.data;
}

export async function fetchMyOrders(token: string): Promise<Order[]> {
  const result = await apiFetch<{ data: Order[] }>("/api/orders/me", { token });
  return result.data;
}

export async function sendWhatsappOtp(phoneNumber: string): Promise<{ message: string }> {
  return apiFetch("/api/auth/whatsapp/send", {
    method: "POST",
    body: JSON.stringify({ phoneNumber }),
  });
}

export async function verifyWhatsappOtp(
  phoneNumber: string,
  otp: string,
  name?: string,
): Promise<{ token: string; user: { id: string; phoneNumber: string; name: string; role: string } }> {
  return apiFetch("/api/auth/whatsapp/verify", {
    method: "POST",
    body: JSON.stringify({ phoneNumber, otp, name }),
  });
}

/* ------------------------------------------------------------------ */
/* Supplier proposals + Admin proposal queue                          */
/* ------------------------------------------------------------------ */

export interface ProposeProductPayload {
  title: string;
  description: string;
  images: string[];
  category: string;
  market_anchor_price: number;
  base_wholesale_cost: number;
  max_squad_discount_percent: number;
  dualCheckoutEnabled?: boolean;
  maxSquadMembers?: number;
}

export async function proposeProduct(payload: ProposeProductPayload, token: string): Promise<Product> {
  const result = await apiFetch<{ data: Product }>("/api/products/supplier/propose", {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
  return result.data;
}

export async function uploadProductDirect(
  payload: ProposeProductPayload & { supplierId: string },
  token: string,
): Promise<Product> {
  const result = await apiFetch<{ data: Product }>("/api/products/admin/upload", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
  return result.data;
}

export async function fetchPendingProducts(token: string): Promise<PendingProduct[]> {
  const result = await apiFetch<{ data: PendingProduct[] }>("/api/products/admin/pending", { token });
  return result.data;
}

export async function approveProduct(productId: string, token: string): Promise<Product> {
  const result = await apiFetch<{ data: Product }>(`/api/products/${productId}/approve`, {
    method: "PUT",
    token,
  });
  return result.data;
}

export async function rejectProduct(productId: string, token: string): Promise<Product> {
  const result = await apiFetch<{ data: Product }>(`/api/products/${productId}/reject`, {
    method: "PUT",
    token,
  });
  return result.data;
}

export async function fetchSuppliers(token: string): Promise<SupplierSummary[]> {
  const result = await apiFetch<{ data: SupplierSummary[] }>("/api/users/suppliers", { token });
  return result.data;
}

/* ------------------------------------------------------------------ */
/* Supplier order manifests                                           */
/* ------------------------------------------------------------------ */

export async function fetchSupplierManifests(token: string): Promise<ManifestOrder[]> {
  const result = await apiFetch<{ data: ManifestOrder[] }>("/api/orders/manifest", { token });
  return result.data;
}

export async function updateOrderTracking(
  orderId: string,
  trackingNumber: string,
  courier: string,
  token: string,
): Promise<{ orderId: string; trackingNumber: string; courier?: string; logisticsStatus: string }> {
  const result = await apiFetch<{
    data: { orderId: string; trackingNumber: string; courier?: string; logisticsStatus: string };
  }>(`/api/orders/${orderId}/tracking`, {
    method: "PUT",
    token,
    body: JSON.stringify({ trackingNumber, courier }),
  });
  return result.data;
}

/* ------------------------------------------------------------------ */
/* Admin dispute / ledger console                                     */
/* ------------------------------------------------------------------ */

export async function fetchDisputes(token: string): Promise<Dispute[]> {
  const result = await apiFetch<{ data: Dispute[] }>("/api/disputes", { token });
  return result.data;
}

export async function resolveDispute(
  disputeId: string,
  resolution: "Refund" | "Reject",
  adminNotes: string,
  token: string,
): Promise<{ disputeId: string; status: string }> {
  const result = await apiFetch<{ data: { disputeId: string; status: string } }>(
    `/api/disputes/${disputeId}/resolve`,
    {
      method: "PUT",
      token,
      body: JSON.stringify({ resolution, admin_notes: adminNotes }),
    },
  );
  return result.data;
}

import type { Category, Paginated, Product, Squad } from "./types";

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

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
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

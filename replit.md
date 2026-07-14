# DiscountBazaar.PK

Decentralized, zero-inventory social commerce engine for Pakistan, combining standard e-commerce with a viral "Toli" (Squad Buying) mechanism — group deals with dynamic discounts — and Safepay-based escrow for deposits.

## Architecture
- **Backend** (repo root, `src/`): Node.js + Express + TypeScript, entry point `src/server.ts`. MongoDB via Mongoose (models: User, Product, Squad, Transaction, Order, Dispute). JWT auth (WhatsApp OTP login, currently mocked — OTP is logged to the console, not actually sent). BullMQ/Redis background workers for squad expiration/voting resolution. Safepay SDK integration for escrow is a drop-in mock (`src/utils/safepay.ts`, no real API key) — `POST /api/escrow/checkout` returns a fake hosted-checkout URL, and since nothing calls `POST /api/escrow/webhook` automatically without a real gateway, the frontend fires that webhook itself right after checkout to reconcile squad membership, exactly like Safepay would in production. Runs on port 8000 internally.
- **Frontend** (`web/`): Next.js 16 (App Router) + TypeScript + Tailwind v4. Runs on port 5000 (the Replit preview port). All product/category/squad data is fetched live from the backend — nothing is hardcoded. Client-side calls use relative `/api/...` paths (proxied to the backend via `next.config.ts` rewrites); server components fetch `http://127.0.0.1:8000` directly.
- **Data stores**: MongoDB (`.data/mongodb`) and Redis (`.data/redis`) run as local processes, started by the `Backend` workflow before `npm run dev`. Not cloud services — local dev only.
- **Naming**: internal code/model names use "Squad" (matches the original backend model); all user-facing copy uses "Toli" (matches the approved design direction). Keep this split when adding new UI text.

## Running locally
- `Backend` workflow starts mongod + redis-server + the Express API (port 8000).
- `Frontend` workflow starts the Next.js dev server (port 5000, the one shown in the preview pane).
- `npm run seed` (repo root) clears and reseeds demo data: 10 products across 6 categories, 3 "Gathering" Tolis, an admin user and a supplier user. Logs their phone numbers for WhatsApp OTP login testing (OTP itself is printed to the `Backend` workflow console, since WhatsApp sending isn't wired to a real provider yet).

## Dual-checkout & Buyer Dashboard (Phase 3.2)
- Product detail page shows two cards: "Buy Now" (client-side cart) and "Join Toli" (real escrow flow — 10% deposit hold, dynamic squad price, financial breakdown). Not logged in → opens the WhatsApp OTP modal.
- "Join Toli" calls `POST /api/escrow/checkout`, then simulates the Safepay authorization webhook (see backend note above), then redirects to `/dashboard?success=true`.
- `/dashboard` (protected, client-side redirect if not logged in) has two tabs: "Active Pledges (Tolis)" (`GET /api/squads/me`, with a high-priority Proceed/Opt-Out voting card when a squad's status is `Voting`, wired to `POST /api/squads/:id/vote`) and "Order History" (`GET /api/orders/me`, with a logistics-status timeline).

## Not yet built
- Standard "Buy Now" checkout doesn't create a real `Order` yet — it only adds to the client-side cart. Escrow/Toli checkout is fully wired to the backend.
- Admin/supplier dashboards for managing the catalog (products are currently added via the seed script or directly in MongoDB).
- Flutter mobile app.

## User Preferences
(none recorded yet)

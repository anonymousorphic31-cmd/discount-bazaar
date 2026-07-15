# Changelog

## [Unreleased]

### Added

**Initial Setup**
- Created initial repository structure.
- Added README.md, PROJECT_CONTEXT.md, TODO.md, and CHANGELOG.md.
- Finalized database schemas and UI/UX design language.

**Backend Architecture & APIs**
- Initialized Express server, MongoDB connection, and Mongoose schemas.
- Implemented Auth middleware and WhatsApp OTP controllers.
- Built Hybrid Catalog (Products) controllers with strict TypeScript typing.
- Implemented Safepay digital escrow mocks and Squad Engine webhooks.
- Added BullMQ resolution workers (`votingResolutionWorker`).
- Created `orderController` featuring `computeOrderFinance`.
- Implemented `disputeController` for buyer ticketing and QA.
- Added `courierWebhook` to sync logistics updates.
- Added `resolveDispute` for Admins to process Refunds/Rejects.
- Re-engineered the escrow webhook to bypass local standalone MongoDB limitations.
- Added `ProductApprovalStatus` enum and supplier proposal flow endpoints.
- Added courier tracking update endpoint and Admin supplier-picker route.

**Frontend (Next.js)**
- Initialized Next.js frontend connected to the live Node.js backend.
- Built Hybrid Homepage, `/products` catalog, and dynamic `/products/[id]` pages.
- Implemented real WhatsApp OTP login modal.
- Created database seed script for active Tolis (Squads) and products.
- Built Dual-Checkout Product Detail Page (PDP).
- Built protected Buyer Dashboard (`/dashboard`).
- Built Client-Side `RoleGuard` component.
- Built Supplier SaaS Dashboard (`/supplier`) with Propose Deal form and Order Manifests.
- Built Admin Command Center (`/admin`) with Proposal Queue, Direct Listing, and Conflict Resolution.

- ### Added (Security & QA Patches)
- Secured `courierWebhook` with `x-courier-secret` header verification.
- Implemented real HMAC-SHA256 signature verification for Safepay webhooks.
- Added NoSQL injection guards and strict type-checking on Mongoose query filters.
- Added pre-validation for positive-number pricing in `createProduct` and `proposeDeal`.
- Enforced crash-fast boot checks for required environment variables.
- Implemented a 15-minute `setInterval` fallback sweep for stranded BullMQ squad jobs.
- Added `useIsMounted` hook to fix Next.js React hydration risks on date rendering.

- ### Added (UI & Navigational Polish)
- Redesigned Hero section with premium Oceanic Blue/Electric Mint gradient and responsive typography.
- Executed global terminology replacement replacing "Toli" with "Squad".
- Cleaned Navbar navigation to strictly feature Products, Offers, and Become a Supplier.
- Implemented `ProductGallery` component on the PDP for rich media thumbnails.
- Created placeholder static pages (Support, Privacy Policy, Refund Policy) and linked them in a reorganized footer.
- Verified 100% dynamic data mapping (zero hardcoded products).

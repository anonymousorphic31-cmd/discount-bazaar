# DiscountBazaar.PK

Decentralized, zero-inventory social commerce engine for Pakistan, combining standard e-commerce with a viral "Squad Buying" mechanism (group deals with dynamic discounts) and Safepay-based escrow for deposits.

## Current State (imported project)
Only the **backend** exists so far:
- Node.js + Express + TypeScript, entry point `src/server.ts`
- MongoDB via Mongoose (models: User, Product, Squad, Transaction, Order, Dispute)
- JWT auth, BullMQ/Redis background workers for squad expiration
- Safepay SDK integration for escrow (not yet configured — keys blank)

Not yet built: Next.js web portals (buyer/admin/supplier) and the Flutter mobile app — see `TODO.md` for the full roadmap and `PROJECT_CONTEXT.md` for architecture/brand details.

The project has **not been configured to run on Replit yet** — no workflow, no `.env`, no MongoDB connection set up. This was intentional per user request (see User preferences below).

## User Preferences
- The user will personally guide building a Next.js frontend to connect to this backend — do not scaffold or set up the frontend proactively; wait for their direction.

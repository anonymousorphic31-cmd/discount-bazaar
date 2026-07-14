import "dotenv/config";
import mongoose, { Types } from "mongoose";
import { connectDB, closeDB } from "../src/config/db.js";
import User from "../src/models/User.js";
import Product from "../src/models/Product.js";
import Squad from "../src/models/Squad.js";
import { UserRole } from "../src/types/enums.js";

/**
 * Development seed data — populates a realistic catalog so the storefront
 * has real records to render. This is the only way products/squads reach the
 * homepage; the frontend never hardcodes catalog content. Safe to re-run —
 * it clears and rebuilds the demo dataset each time.
 */

interface SeedProduct {
  title: string;
  description: string;
  images: string[];
  category: string;
  marketAnchorPrice: number;
  baseWholesaleCost: number;
  maxSquadDiscount: number;
  dualCheckoutEnabled: boolean;
  maxSquadMembers: number;
}

const SEED_PRODUCTS: SeedProduct[] = [
  {
    title: "Sony WH-1000XM4 Wireless Headphones",
    description: "Industry-leading noise cancelling over-ear headphones with 30-hour battery life.",
    images: ["https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800&q=80"],
    category: "Electronics",
    marketAnchorPrice: 82500,
    baseWholesaleCost: 58000,
    maxSquadDiscount: 0.24,
    dualCheckoutEnabled: true,
    maxSquadMembers: 30,
  },
  {
    title: "Apple Watch Series 9 GPS+Cellular",
    description: "Always-on display, advanced health sensors, and all-day battery life.",
    images: ["https://images.unsplash.com/photo-1551816230-ef5deaed4a26?w=800&q=80"],
    category: "Wearables",
    marketAnchorPrice: 98000,
    baseWholesaleCost: 71000,
    maxSquadDiscount: 0.2,
    dualCheckoutEnabled: true,
    maxSquadMembers: 30,
  },
  {
    title: "Nike Air Max 270 React",
    description: "Lightweight cushioning with a bold look — built for all-day comfort.",
    images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80"],
    category: "Fashion",
    marketAnchorPrice: 24500,
    baseWholesaleCost: 15800,
    maxSquadDiscount: 0.3,
    dualCheckoutEnabled: true,
    maxSquadMembers: 30,
  },
  {
    title: "Wireless Bluetooth Earbuds Pro",
    description: "Compact true-wireless earbuds with active noise cancellation and charging case.",
    images: ["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80"],
    category: "Accessories",
    marketAnchorPrice: 4200,
    baseWholesaleCost: 2400,
    maxSquadDiscount: 0.28,
    dualCheckoutEnabled: false,
    maxSquadMembers: 30,
  },
  {
    title: "Instax Mini 11 Instant Camera",
    description: "Retro-styled instant film camera — automatic exposure, selfie mirror included.",
    images: ["https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80"],
    category: "Electronics",
    marketAnchorPrice: 18500,
    baseWholesaleCost: 12600,
    maxSquadDiscount: 0.22,
    dualCheckoutEnabled: false,
    maxSquadMembers: 30,
  },
  {
    title: "Classic Aviator Sunglasses",
    description: "UV400-protected polarized lenses with a durable metal frame.",
    images: ["https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80"],
    category: "Fashion",
    marketAnchorPrice: 2800,
    baseWholesaleCost: 1500,
    maxSquadDiscount: 0.3,
    dualCheckoutEnabled: false,
    maxSquadMembers: 30,
  },
  {
    title: "Minimalist Wooden Desk Lamp",
    description: "Warm-white LED desk lamp with a solid oak base and touch dimmer.",
    images: ["https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80"],
    category: "Home Decor",
    marketAnchorPrice: 5600,
    baseWholesaleCost: 3400,
    maxSquadDiscount: 0.26,
    dualCheckoutEnabled: false,
    maxSquadMembers: 30,
  },
  {
    title: "Anker PowerCore 20000mAh Power Bank",
    description: "High-capacity portable charger with fast-charge USB-C output.",
    images: ["https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&q=80"],
    category: "Gadgets",
    marketAnchorPrice: 7200,
    baseWholesaleCost: 4600,
    maxSquadDiscount: 0.25,
    dualCheckoutEnabled: true,
    maxSquadMembers: 30,
  },
  {
    title: "Ceramic Plant Pot Set (3 pcs)",
    description: "Modern matte-finish planters in three sizes — drainage hole included.",
    images: ["https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&q=80"],
    category: "Home Decor",
    marketAnchorPrice: 3100,
    baseWholesaleCost: 1900,
    maxSquadDiscount: 0.27,
    dualCheckoutEnabled: false,
    maxSquadMembers: 30,
  },
  {
    title: "Smart Fitness Band 5",
    description: "24/7 heart-rate tracking, sleep monitoring, and 14-day battery life.",
    images: ["https://images.unsplash.com/photo-1557935728-e6d1eaabe558?w=800&q=80"],
    category: "Wearables",
    marketAnchorPrice: 5400,
    baseWholesaleCost: 3200,
    maxSquadDiscount: 0.29,
    dualCheckoutEnabled: true,
    maxSquadMembers: 30,
  },
];

function slugify(title: string): string {
  return (
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") +
    "-" +
    Date.now().toString(36) +
    Math.floor(Math.random() * 1000).toString(36)
  );
}

async function seed(): Promise<void> {
  await connectDB();

  console.info("[seed] Clearing previous demo data...");
  await Promise.all([
    Product.deleteMany({}),
    Squad.deleteMany({}),
    User.deleteMany({ phoneNumber: { $in: ["+923000000001", "+923000000002"] } }),
  ]);

  const admin = await User.create({
    phoneNumber: "+923000000001",
    role: UserRole.Admin,
    name: "DiscountBazaar Admin",
  });

  const supplier = await User.create({
    phoneNumber: "+923000000002",
    role: UserRole.Supplier,
    name: "HHC Wholesale Supplier",
    supplierDetails: {
      companyName: "HHC Distribution Co.",
      contactPerson: "Ahmed Raza",
      rating: 4.6,
      isActive: true,
      catalogs: [],
    },
  });
  void admin;

  console.info(`[seed] Creating ${SEED_PRODUCTS.length} products...`);
  const products = await Product.insertMany(
    SEED_PRODUCTS.map((p) => ({
      title: p.title,
      slug: slugify(p.title),
      description: p.description,
      images: p.images,
      category: p.category,
      supplierId: supplier._id,
      pricing: {
        marketAnchorPrice: p.marketAnchorPrice,
        baseWholesaleCost: p.baseWholesaleCost,
        maxSquadDiscount: p.maxSquadDiscount,
        currentRetailPrice: p.marketAnchorPrice,
      },
      dualCheckoutEnabled: p.dualCheckoutEnabled,
      maxSquadMembers: p.maxSquadMembers,
      isActive: true,
    })),
  );

  // Spin up a handful of "Gathering" squads on dual-checkout products so the
  // homepage's Trending Squads rail has live groups to render.
  const squadEligible = products.filter((p) => p.dualCheckoutEnabled);
  const squadSeeds = [
    { members: 15, hoursLeft: 20 },
    { members: 22, hoursLeft: 8 },
    { members: 6, hoursLeft: 23 },
  ];

  console.info(`[seed] Creating ${Math.min(squadSeeds.length, squadEligible.length)} active squads...`);
  await Squad.insertMany(
    squadEligible.slice(0, squadSeeds.length).map((product, i) => ({
      productId: product._id,
      targetMembers: product.maxSquadMembers,
      currentMembers: squadSeeds[i].members,
      members: [],
      expiresAt: new Date(Date.now() + squadSeeds[i].hoursLeft * 60 * 60 * 1000),
      status: "Gathering",
    })),
  );

  console.info("[seed] Done. Admin phone: +923000000001 | Supplier phone: +923000000002");
  console.info("[seed] (Use POST /api/auth/whatsapp/send + /verify with these numbers to sign in as Admin/Supplier — OTP is logged to the backend console.)");
}

seed()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDB();
    void mongoose;
    void Types;
  });

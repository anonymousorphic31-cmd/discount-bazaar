import { type Request, type Response } from "express";
import { Types } from "mongoose";
import Product from "../models/Product.js";
import { ProductApprovalStatus as ApprovalStatusEnum } from "../types/enums.js";
import { asyncHandler } from "../utils/asyncHandler.js";

interface GetProductsQuery {
  category?: string;
  page?: string;
  limit?: string;
  sort?: string;
  search?: string;
}

/**
 * GET /api/products
 * Public. Returns a paginated list of active products with optional category
 * filter, text search, and sort.
 */
export const getAllProducts = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { category, page, limit, sort, search } = req.query as GetProductsQuery;

    const filter: Record<string, unknown> = { isActive: true };
    if (category) filter.category = category;
    if (search) filter.$text = { $search: search };

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    // sort=price|createdAt|-createdAt|... → mongoose sort object
    let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === "price") sortOption = { "pricing.currentRetailPrice": 1 };
    else if (sort === "-price") sortOption = { "pricing.currentRetailPrice": -1 };

    const [items, total] = await Promise.all([
      Product.find(filter).sort(sortOption).skip(skip).limit(limitNum).lean(),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      data: items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 0,
      },
    });
  },
);

/**
 * GET /api/products/categories
 * Public. Returns the distinct set of categories currently in use across
 * active products, with a product count for each — powers the homepage
 * "Shop by Category" rail without any hardcoded category list.
 */
export const getCategories = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const categories = await Product.aggregate<{ _id: string; count: number }>([
      { $match: { isActive: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      data: categories.map((c) => ({ name: c._id, productCount: c.count })),
    });
  },
);

/**
 * GET /api/products/:id
 * Public. Returns a single active product by its ObjectId.
 */
export const getProductById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid product id." });
      return;
    }

    const product = await Product.findOne({ _id: id, isActive: true }).lean();
    if (!product) {
      res.status(404).json({ error: "Product not found." });
      return;
    }

    res.status(200).json({ data: product });
  },
);

interface CreateProductBody {
  title?: string;
  description?: string;
  images?: string[];
  category?: string;
  supplierId?: string;
  market_anchor_price?: number;
  base_wholesale_cost?: number;
  max_squad_discount_percent?: number;
  dualCheckoutEnabled?: boolean;
  maxSquadMembers?: number;
}

/**
 * POST /api/products/admin/upload
 * Admin-only. Creates a new product. Pricing fields are accepted in the
 * business-friendly snake_case names from the spec and mapped to the schema.
 */
export const createProduct = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateProductBody;

    const {
      title,
      description,
      images,
      category,
      supplierId,
      market_anchor_price,
      base_wholesale_cost,
      max_squad_discount_percent,
      dualCheckoutEnabled,
      maxSquadMembers,
    } = body;

    if (!title || !description || !category || !supplierId) {
      res.status(400).json({
        error: "title, description, category, and supplierId are required.",
      });
      return;
    }
    if (
      market_anchor_price == null ||
      base_wholesale_cost == null ||
      max_squad_discount_percent == null
    ) {
      res.status(400).json({
        error: "market_anchor_price, base_wholesale_cost, and max_squad_discount_percent are required.",
      });
      return;
    }
    if (!Types.ObjectId.isValid(supplierId)) {
      res.status(400).json({ error: "Invalid supplierId." });
      return;
    }

    // Validation: wholesale cost cannot exceed anchor price; discount in 0–100.
    if (base_wholesale_cost > market_anchor_price) {
      res
        .status(400)
        .json({ error: "base_wholesale_cost cannot exceed market_anchor_price." });
      return;
    }
    if (max_squad_discount_percent < 0 || max_squad_discount_percent > 100) {
      res.status(400).json({ error: "max_squad_discount_percent must be between 0 and 100." });
      return;
    }

    const slug =
      title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") +
      "-" + Date.now().toString(36);

    const product = await Product.create({
      title,
      slug,
      description,
      images: images ?? [],
      category,
      supplierId: new Types.ObjectId(supplierId),
      pricing: {
        marketAnchorPrice: market_anchor_price,
        baseWholesaleCost: base_wholesale_cost,
        maxSquadDiscount: max_squad_discount_percent / 100,
        currentRetailPrice: market_anchor_price,
      },
      dualCheckoutEnabled: dualCheckoutEnabled ?? true,
      maxSquadMembers: maxSquadMembers ?? 30,
      isActive: true,
      approvalStatus: ApprovalStatusEnum.Approved,
    });

    res.status(201).json({ data: product });
  },
);

/* ------------------------------------------------------------------ */
/* Step 3 — Supplier proposal + Admin review queue                    */
/* ------------------------------------------------------------------ */

interface ProposeProductBody {
  title?: string;
  description?: string;
  images?: string[];
  category?: string;
  market_anchor_price?: number;
  base_wholesale_cost?: number;
  max_squad_discount_percent?: number;
  dualCheckoutEnabled?: boolean;
  maxSquadMembers?: number;
}

/**
 * PUT /api/products/supplier/propose
 * Supplier-only. Submits a new product for admin review. Created inactive
 * and Pending — it never appears on the storefront until an admin approves
 * it from the Proposal Queue.
 */
export const proposeProduct = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const supplierId = req.user?.userId;
    if (!supplierId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const body = req.body as ProposeProductBody;
    const {
      title,
      description,
      images,
      category,
      market_anchor_price,
      base_wholesale_cost,
      max_squad_discount_percent,
      dualCheckoutEnabled,
      maxSquadMembers,
    } = body;

    if (!title || !description || !category) {
      res.status(400).json({ error: "title, description, and category are required." });
      return;
    }
    if (
      market_anchor_price == null ||
      base_wholesale_cost == null ||
      max_squad_discount_percent == null
    ) {
      res.status(400).json({
        error: "market_anchor_price, base_wholesale_cost, and max_squad_discount_percent are required.",
      });
      return;
    }
    if (base_wholesale_cost > market_anchor_price) {
      res
        .status(400)
        .json({ error: "base_wholesale_cost cannot exceed market_anchor_price." });
      return;
    }
    if (max_squad_discount_percent < 0 || max_squad_discount_percent > 100) {
      res.status(400).json({ error: "max_squad_discount_percent must be between 0 and 100." });
      return;
    }

    const slug =
      title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") +
      "-" + Date.now().toString(36);

    const product = await Product.create({
      title,
      slug,
      description,
      images: images ?? [],
      category,
      supplierId: new Types.ObjectId(supplierId),
      pricing: {
        marketAnchorPrice: market_anchor_price,
        baseWholesaleCost: base_wholesale_cost,
        maxSquadDiscount: max_squad_discount_percent / 100,
        currentRetailPrice: market_anchor_price,
      },
      dualCheckoutEnabled: dualCheckoutEnabled ?? true,
      maxSquadMembers: maxSquadMembers ?? 30,
      isActive: false,
      approvalStatus: ApprovalStatusEnum.Pending,
    });

    res.status(201).json({
      message: "Proposal submitted for admin review.",
      data: product,
    });
  },
);

/**
 * GET /api/products/admin/pending
 * Admin-only. Lists all supplier proposals awaiting review, newest first.
 */
export const getPendingProducts = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const items = await Product.find({ approvalStatus: ApprovalStatusEnum.Pending })
      .populate({ path: "supplierId", select: "name phoneNumber supplierDetails.companyName" })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ data: items });
  },
);

/**
 * PUT /api/products/:id/approve
 * Admin-only. Publishes a pending proposal to the live catalog.
 */
export const approveProduct = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid product id." });
      return;
    }

    const product = await Product.findById(id);
    if (!product) {
      res.status(404).json({ error: "Product not found." });
      return;
    }
    if (product.approvalStatus !== ApprovalStatusEnum.Pending) {
      res.status(409).json({ error: `Product is already ${product.approvalStatus}.` });
      return;
    }

    product.approvalStatus = ApprovalStatusEnum.Approved;
    product.isActive = true;
    await product.save();

    res.status(200).json({ message: "Product approved and published.", data: product });
  },
);

/**
 * PUT /api/products/:id/reject
 * Admin-only. Rejects a pending proposal — it stays out of the catalog.
 */
export const rejectProduct = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid product id." });
      return;
    }

    const product = await Product.findById(id);
    if (!product) {
      res.status(404).json({ error: "Product not found." });
      return;
    }
    if (product.approvalStatus !== ApprovalStatusEnum.Pending) {
      res.status(409).json({ error: `Product is already ${product.approvalStatus}.` });
      return;
    }

    product.approvalStatus = ApprovalStatusEnum.Rejected;
    product.isActive = false;
    await product.save();

    res.status(200).json({ message: "Product proposal rejected.", data: product });
  },
);

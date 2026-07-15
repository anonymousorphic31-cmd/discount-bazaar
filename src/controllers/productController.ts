import { type Request, type Response } from "express";
import { Types } from "mongoose";
import Product from "../models/Product.js";
import { ProductApprovalStatus as ApprovalStatusEnum } from "../types/enums.js";
import { asyncHandler } from "../utils/asyncHandler.js";

interface PricingInput {
  market_anchor_price?: number;
  base_wholesale_cost?: number;
  max_squad_discount_percent?: number;
  deposit_percentage?: number;
}

/**
 * Validates that pricing fields are finite, positive numbers before they reach
 * Mongoose. Returns a specific error message for the first invalid field, or
 * null when all three are acceptable. Prevents raw 500s on malformed input.
 */
function validatePricing(input: PricingInput): string | null {
  const { market_anchor_price, base_wholesale_cost, max_squad_discount_percent, deposit_percentage } = input;

  if (
    market_anchor_price == null ||
    typeof market_anchor_price !== "number" ||
    !Number.isFinite(market_anchor_price) ||
    market_anchor_price <= 0
  ) {
    return "market_anchor_price must be a positive number.";
  }
  if (
    base_wholesale_cost == null ||
    typeof base_wholesale_cost !== "number" ||
    !Number.isFinite(base_wholesale_cost) ||
    base_wholesale_cost <= 0
  ) {
    return "base_wholesale_cost must be a positive number.";
  }
  if (
    max_squad_discount_percent == null ||
    typeof max_squad_discount_percent !== "number" ||
    !Number.isFinite(max_squad_discount_percent) ||
    max_squad_discount_percent < 0 ||
    max_squad_discount_percent > 100
  ) {
    return "max_squad_discount_percent must be a number between 0 and 100.";
  }
  if (base_wholesale_cost > market_anchor_price) {
    return "base_wholesale_cost cannot exceed market_anchor_price.";
  }
  if (
    deposit_percentage != null &&
    (typeof deposit_percentage !== "number" || !Number.isFinite(deposit_percentage) || deposit_percentage < 0 || deposit_percentage > 100)
  ) {
    return "deposit_percentage must be a number between 0 and 100.";
  }
  return null;
}

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

    // NoSQL injection guard: only plain strings may enter the Mongoose filter.
    if (category !== undefined && typeof category !== "string") {
      res.status(400).json({ error: "category must be a string." });
      return;
    }
    if (search !== undefined && typeof search !== "string") {
      res.status(400).json({ error: "search must be a string." });
      return;
    }

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
  deposit_percentage?: number;
  dualCheckoutEnabled?: boolean;
  maxSquadMembers?: number;
}

interface UpdateProductBody extends CreateProductBody {
  isActive?: boolean;
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
      deposit_percentage,
      dualCheckoutEnabled,
      maxSquadMembers,
    } = body;

    if (!title || !description || !category || !supplierId) {
      res.status(400).json({
        error: "title, description, category, and supplierId are required.",
      });
      return;
    }
    const pricingError = validatePricing({
      market_anchor_price,
      base_wholesale_cost,
      max_squad_discount_percent,
    });
    if (pricingError) {
      res.status(400).json({ error: pricingError });
      return;
    }
    if (!Types.ObjectId.isValid(supplierId)) {
      res.status(400).json({ error: "Invalid supplierId." });
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
      deposit_percentage: deposit_percentage ?? 10,
      pricing: {
        marketAnchorPrice: market_anchor_price,
        baseWholesaleCost: base_wholesale_cost,
        maxSquadDiscount: max_squad_discount_percent! / 100,
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
  deposit_percentage?: number;
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
      deposit_percentage,
      dualCheckoutEnabled,
      maxSquadMembers,
    } = body;

    if (!title || !description || !category) {
      res.status(400).json({ error: "title, description, and category are required." });
      return;
    }
    const pricingError = validatePricing({
      market_anchor_price,
      base_wholesale_cost,
      max_squad_discount_percent,
    });
    if (pricingError) {
      res.status(400).json({ error: pricingError });
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
      deposit_percentage: deposit_percentage ?? 10,
      pricing: {
        marketAnchorPrice: market_anchor_price,
        baseWholesaleCost: base_wholesale_cost,
        maxSquadDiscount: max_squad_discount_percent! / 100,
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

/**
 * GET /api/products/admin/all
 * Admin-only. Returns all products including inactive ones for dashboard management.
 */
export const getAdminProducts = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const products = await Product.find({})
      .populate({ path: "supplierId", select: "name phoneNumber email supplierDetails.companyName verificationStatus" })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ data: products });
  },
);

/**
 * PUT /api/products/admin/:id
 * Admin-only. Updates a product record.
 */
export const updateAdminProduct = asyncHandler(
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

    const body = req.body as UpdateProductBody;
    const pricingError = validatePricing({
      market_anchor_price: body.market_anchor_price ?? product.pricing.marketAnchorPrice,
      base_wholesale_cost: body.base_wholesale_cost ?? product.pricing.baseWholesaleCost,
      max_squad_discount_percent:
        body.max_squad_discount_percent ?? product.pricing.maxSquadDiscount * 100,
      deposit_percentage: body.deposit_percentage ?? product.deposit_percentage,
    });
    if (pricingError) {
      res.status(400).json({ error: pricingError });
      return;
    }

    if (body.title) product.title = body.title;
    if (body.description) product.description = body.description;
    if (body.images) product.images = body.images as unknown as Types.Array<string>;
    if (body.category) product.category = body.category;
    if (body.supplierId && Types.ObjectId.isValid(body.supplierId)) {
      product.supplierId = new Types.ObjectId(body.supplierId);
    }
    if (body.market_anchor_price != null) product.pricing.marketAnchorPrice = body.market_anchor_price;
    if (body.base_wholesale_cost != null) product.pricing.baseWholesaleCost = body.base_wholesale_cost;
    if (body.max_squad_discount_percent != null) {
      product.pricing.maxSquadDiscount = body.max_squad_discount_percent / 100;
    }
    if (body.deposit_percentage != null) product.deposit_percentage = body.deposit_percentage;
    if (body.dualCheckoutEnabled != null) product.dualCheckoutEnabled = body.dualCheckoutEnabled;
    if (body.maxSquadMembers != null) product.maxSquadMembers = body.maxSquadMembers;
    if (body.isActive != null) product.isActive = body.isActive;
    if (body.market_anchor_price != null) product.pricing.currentRetailPrice = body.market_anchor_price;

    await product.save();
    res.status(200).json({ data: product });
  },
);

/**
 * DELETE /api/products/admin/:id
 * Admin-only. Soft-deletes a product from the live catalog.
 */
export const deleteAdminProduct = asyncHandler(
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

    product.isActive = false;
    product.approvalStatus = ApprovalStatusEnum.Rejected;
    await product.save();

    res.status(200).json({ message: "Product removed from the live catalog.", data: { id: product._id.toString() } });
  },
);

import { type Request, type Response } from "express";
import User from "../models/User.js";
import { UserRole as UserRoleEnum } from "../types/enums.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * GET /api/users/suppliers
 * Admin-only. Lists all supplier accounts so the Admin Command Center can
 * attribute a Direct Listing to a real supplier record.
 */
export const getSuppliers = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const suppliers = await User.find({ role: UserRoleEnum.Supplier })
      .select("name phoneNumber supplierDetails.companyName")
      .sort({ name: 1 })
      .lean();

    res.status(200).json({ data: suppliers });
  },
);

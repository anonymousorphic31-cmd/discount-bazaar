import { type Request, type Response } from "express";
import User from "../models/User.js";
import { UserRole as UserRoleEnum } from "../types/enums.js";
import { asyncHandler } from "../utils/asyncHandler.js";

interface SupplierApplicationBody {
  decision?: "Approved" | "Rejected";
  reviewNote?: string;
}

/**
 * GET /api/users/suppliers
 * Admin-only. Lists all supplier accounts so the Admin Command Center can
 * attribute a Direct Listing to a real supplier record.
 */
export const getSuppliers = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const suppliers = await User.find({ role: UserRoleEnum.Supplier })
      .select("name phoneNumber email verificationStatus reviewNote supplierDetails.companyName dropshipNetworkId cnicNtn contactNumber")
      .sort({ name: 1 })
      .lean();

    res.status(200).json({ data: suppliers });
  },
);

/**
 * GET /api/users/supplier-applications
 * Admin-only. Returns all supplier applications, including pending ones.
 */
export const getSupplierApplications = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const applications = await User.find({ role: UserRoleEnum.Supplier })
      .select("name phoneNumber email verificationStatus reviewNote supplierDetails.companyName dropshipNetworkId cnicNtn contactNumber createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ data: applications });
  },
);

/**
 * PATCH /api/users/supplier-applications/:id/decision
 * Admin-only. Approves or rejects a supplier application and stores the review note.
 */
export const resolveSupplierApplication = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { decision, reviewNote } = req.body as SupplierApplicationBody;

    if (!id) {
      res.status(400).json({ error: "A supplier application id is required." });
      return;
    }
    if (decision !== "Approved" && decision !== "Rejected") {
      res.status(400).json({ error: "decision must be Approved or Rejected." });
      return;
    }

    const application = await User.findById(id);
    if (!application || application.role !== UserRoleEnum.Supplier) {
      res.status(404).json({ error: "Supplier application not found." });
      return;
    }

    application.verificationStatus = decision;
    application.reviewNote = reviewNote?.trim() || undefined;
    if (decision === "Approved") {
      if (!application.supplierDetails) {
        application.supplierDetails = {
          companyName: application.name,
          contactPerson: application.name,
          rating: 0,
          isActive: true,
          catalogs: [] as unknown as import("mongoose").Types.Array<import("mongoose").Types.ObjectId>,
        };
      }
      application.supplierDetails.isActive = true;
    }
    await application.save();

    if (reviewNote?.trim()) {
      console.info(`[supplier review] ${decision} for ${application.phoneNumber}: ${reviewNote.trim()}`);
    }

    res.status(200).json({
      message: `Supplier application ${decision.toLowerCase()}.`,
      data: {
        id: application._id.toString(),
        verificationStatus: application.verificationStatus,
        reviewNote: application.reviewNote ?? null,
      },
    });
  },
);

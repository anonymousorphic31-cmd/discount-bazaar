import { type Request, type Response } from "express";
import { Types } from "mongoose";
import User from "../models/User.js";
import { UserRole as UserRoleEnum } from "../types/enums.js";
import { asyncHandler } from "../utils/asyncHandler.js";

interface SupplierApplicationBody {
  action?: "Approve" | "Reject" | "Request_Changes";
  feedback?: string;
}

interface SupplierMessageBody {
  message?: string;
}

/**
 * GET /api/users/suppliers
 * Admin-only. Lists all supplier accounts so the Admin Command Center can
 * attribute a Direct Listing to a real supplier record.
 */
export const getSuppliers = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const suppliers = await User.find({ role: UserRoleEnum.Supplier })
      .select("name phoneNumber email verificationStatus adminFeedback supplierDetails.companyName dropshipNetworkId cnicNtn contactNumber businessInfo legalDocs bankDetails contactVerification")
      .sort({ name: 1 })
      .lean();

    res.status(200).json({ data: suppliers });
  },
);

/**
 * GET /api/users/supplier-applications
 * Admin-only. Returns supplier applications that have submitted KYC
 * (verificationStatus === 'Pending'). Users who just registered
 * (Unverified) are NOT included — they haven't submitted documents yet.
 */
export const getSupplierApplications = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const applications = await User.find({ role: UserRoleEnum.Supplier, verificationStatus: "Pending" })
      .select("name phoneNumber email verificationStatus adminFeedback supplierDetails.companyName dropshipNetworkId cnicNtn contactNumber businessInfo legalDocs bankDetails contactVerification createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ data: applications });
  },
);

/**
 * PATCH /api/users/supplier-applications/:id/decision
 * Admin-only. Approves, rejects (permanent), or requests changes on a
 * supplier's verification application. Sets verificationStatus and
 * saves adminFeedback when requesting changes.
 */
export const resolveSupplierApplication = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { action, feedback } = req.body as SupplierApplicationBody;

    if (!id || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "A valid supplier id is required." });
      return;
    }
    if (action !== "Approve" && action !== "Reject" && action !== "Request_Changes") {
      res.status(400).json({ error: "action must be 'Approve', 'Reject', or 'Request_Changes'." });
      return;
    }
    if (action === "Request_Changes" && !feedback?.trim()) {
      res.status(400).json({ error: "feedback is required when requesting changes." });
      return;
    }

    const user = await User.findById(id);
    if (!user || user.role !== UserRoleEnum.Supplier) {
      res.status(404).json({ error: "Supplier not found." });
      return;
    }
    if (user.verificationStatus !== "Pending") {
      res.status(409).json({
        error: `Supplier is not in Pending state. Current status: ${user.verificationStatus}.`,
      });
      return;
    }

    if (action === "Approve") {
      user.verificationStatus = "Verified";
      user.adminFeedback = undefined;
      if (user.supplierDetails) {
        user.supplierDetails.isActive = true;
      } else {
        user.supplierDetails = {
          companyName: user.name,
          contactPerson: user.name,
          rating: 0,
          isActive: true,
          catalogs: [] as unknown as import("mongoose").Types.Array<import("mongoose").Types.ObjectId>,
          stockAvailable: 0,
        };
      }
    } else if (action === "Reject") {
      user.verificationStatus = "Rejected";
      user.adminFeedback = feedback?.trim() || undefined;
    } else {
      // Request_Changes
      user.verificationStatus = "Needs_Correction";
      user.adminFeedback = feedback!.trim();
    }

    await user.save();

    res.status(200).json({
      message:
        action === "Approve"
          ? "Supplier verified and approved."
          : action === "Reject"
            ? "Supplier application rejected."
            : "Changes requested from supplier.",
      data: {
        id: user._id.toString(),
        verificationStatus: user.verificationStatus,
        adminFeedback: user.adminFeedback ?? null,
      },
    });
  },
);

interface ShippingAddressBody {
  fullName?: string;
  phoneNumber?: string;
  province?: string;
  city?: string;
  area?: string;
  streetAddress?: string;
  landmark?: string;
}

/**
 * PUT /api/users/profile/address
 * Protected (any authenticated buyer). Saves or updates the buyer's
 * shipping address so the checkout flow can compute delivery fees and
 * display the order summary before initiating Safepay escrow.
 */
export const updateShippingAddress = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const { fullName, phoneNumber, province, city, area, streetAddress, landmark } =
      req.body as ShippingAddressBody;

    if (!fullName?.trim() || !phoneNumber?.trim() || !province?.trim() || !city?.trim() || !area?.trim() || !streetAddress?.trim()) {
      res.status(400).json({ error: "fullName, phoneNumber, province, city, area, and streetAddress are required." });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    user.shippingAddress = {
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      province: province.trim(),
      city: city.trim(),
      area: area.trim(),
      streetAddress: streetAddress.trim(),
      landmark: landmark?.trim() || undefined,
    };
    await user.save();

    res.status(200).json({
      message: "Shipping address saved.",
      data: {
        fullName: user.shippingAddress.fullName,
        phoneNumber: user.shippingAddress.phoneNumber,
        province: user.shippingAddress.province,
        city: user.shippingAddress.city,
        area: user.shippingAddress.area,
        streetAddress: user.shippingAddress.streetAddress,
        landmark: user.shippingAddress.landmark ?? null,
      },
    });
  },
);

/**
 * GET /api/users/profile/address
 * Protected. Returns the saved shipping address for the authenticated buyer.
 */
export const getShippingAddress = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const user = await User.findById(userId).select("shippingAddress").lean();
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    res.status(200).json({ data: user.shippingAddress ?? null });
  },
);

export const messageSupplier = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { message } = req.body as SupplierMessageBody;

    if (!id) {
      res.status(400).json({ error: "A supplier application id is required." });
      return;
    }
    if (!message?.trim()) {
      res.status(400).json({ error: "message is required." });
      return;
    }

    const application = await User.findById(id);
    if (!application || application.role !== UserRoleEnum.Supplier) {
      res.status(404).json({ error: "Supplier application not found." });
      return;
    }

    const emailTarget = application.email ?? application.phoneNumber;
    console.info(`[supplier message] To: ${emailTarget} | Subject: DiscountBazaar.PK Application Update | Body: ${message.trim()}`);

    res.status(200).json({
      message: `Message sent to supplier.`,
      data: {
        id: application._id.toString(),
        sentTo: emailTarget,
      },
    });
  },
);

interface SupplierVerifyBody {
  // Contact verification
  contactVerification?: { emailVerified?: boolean; phoneVerified?: boolean };
  // Business info
  businessInfo?: {
    businessName?: string;
    website?: string;
    dropshipNetworkId?: string;
  };
  // Legal docs
  legalDocs?: {
    ownerName?: string;
    cnicNumber?: string;
    cnicFrontUrl?: string;
    cnicBackUrl?: string;
    ntnNumber?: string;
    ntnDocUrl?: string;
  };
  // Bank details
  bankDetails?: {
    accountTitle?: string;
    iban?: string;
    bankCertUrl?: string;
  };
}

/**
 * PUT /api/supplier/verify/submit
 * Supplier-only (self-service). Accepts the full KYC payload — contact
 * verification flags, business info, legal docs, and bank details — and
 * flips the authenticated supplier's verificationStatus to 'Pending'.
 * Clears any prior adminFeedback. Both email and phone must be verified
 * before the form can be submitted.
 */
export const submitSupplierVerification = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const { contactVerification, businessInfo, legalDocs, bankDetails } =
      req.body as SupplierVerifyBody;

    const user = await User.findById(userId);
    if (!user || user.role !== UserRoleEnum.Supplier) {
      res.status(403).json({ error: "Only supplier accounts can submit business verification." });
      return;
    }
    // Allow re-submission from Unverified OR Needs_Correction.
    if (user.verificationStatus !== "Unverified" && user.verificationStatus !== "Needs_Correction") {
      res.status(409).json({
        error: `Business verification already submitted. Current status: ${user.verificationStatus}.`,
      });
      return;
    }

    // Enforce OTP verification for both channels before accepting the form.
    const emailVerified = contactVerification?.emailVerified === true;
    const phoneVerified = contactVerification?.phoneVerified === true;
    if (!emailVerified || !phoneVerified) {
      res.status(400).json({ error: "Both email and phone must be verified via OTP before submitting." });
      return;
    }

    // Validate required fields.
    const bInfo = businessInfo ?? {};
    const legal = legalDocs ?? {};
    const bank = bankDetails ?? {};
    if (!bInfo.businessName?.trim() || !bInfo.dropshipNetworkId?.trim()) {
      res.status(400).json({ error: "businessName and dropshipNetworkId are required." });
      return;
    }
    if (!legal.ownerName?.trim() || !legal.cnicNumber?.trim() || !legal.cnicFrontUrl?.trim() || !legal.cnicBackUrl?.trim()) {
      res.status(400).json({ error: "ownerName, cnicNumber, cnicFrontUrl, and cnicBackUrl are required." });
      return;
    }
    if (!legal.ntnNumber?.trim() || !legal.ntnDocUrl?.trim()) {
      res.status(400).json({ error: "ntnNumber and ntnDocUrl are required." });
      return;
    }
    if (!bank.accountTitle?.trim() || !bank.iban?.trim() || !bank.bankCertUrl?.trim()) {
      res.status(400).json({ error: "accountTitle, iban, and bankCertUrl are required." });
      return;
    }

    user.contactVerification = { emailVerified, phoneVerified };
    user.businessInfo = {
      businessName: bInfo.businessName.trim(),
      website: bInfo.website?.trim() || undefined,
      dropshipNetworkId: bInfo.dropshipNetworkId.trim(),
    };
    user.legalDocs = {
      ownerName: legal.ownerName.trim(),
      cnicNumber: legal.cnicNumber.trim(),
      cnicFrontUrl: legal.cnicFrontUrl.trim(),
      cnicBackUrl: legal.cnicBackUrl.trim(),
      ntnNumber: legal.ntnNumber.trim(),
      ntnDocUrl: legal.ntnDocUrl.trim(),
    };
    user.bankDetails = {
      accountTitle: bank.accountTitle.trim(),
      iban: bank.iban.trim().toUpperCase(),
      bankCertUrl: bank.bankCertUrl.trim(),
    };
    // Keep legacy fields in sync for backward compatibility with admin lists.
    user.dropshipNetworkId = bInfo.dropshipNetworkId.trim();
    user.cnicNtn = legal.cnicNumber.trim();
    user.businessName = bInfo.businessName.trim();
    user.businessProofUrls = [legal.cnicFrontUrl, legal.cnicBackUrl, legal.ntnDocUrl, bank.bankCertUrl].filter(Boolean);

    user.verificationStatus = "Pending";
    user.adminFeedback = undefined;
    await user.save();

    res.status(200).json({
      message: "Business verification submitted. Your documentation is under review.",
      data: {
        userId: user._id.toString(),
        verificationStatus: user.verificationStatus,
      },
    });
  },
);

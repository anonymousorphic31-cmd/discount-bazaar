import { type Request, type Response } from "express";
import User from "../models/User.js";
import { UserRole as UserRoleEnum } from "../types/enums.js";
import { generateOtp, signToken } from "../utils/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

interface SendOtpBody {
  phoneNumber?: string;
}

interface VerifyOtpBody {
  phoneNumber?: string;
  otp?: string;
  name?: string;
}

/**
 * POST /api/auth/whatsapp/send
 * Generates a WhatsApp OTP, persists it (hashed-by-select) on the prospective
 * user record, and mocks the SMS-gateway send by logging to the console.
 */
export const sendOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { phoneNumber } = req.body as SendOtpBody;
  if (!phoneNumber || !/^\+?\d{10,15}$/.test(phoneNumber)) {
    res.status(400).json({ error: "A valid phoneNumber is required." });
    return;
  }

  const { code, expiresAt } = generateOtp();

  // Upsert a lightweight record purely to carry the OTP between send and verify.
  await User.updateOne(
    { phoneNumber },
    { $set: { whatsappOtp: code, otpExpiresAt: expiresAt } },
    { upsert: true },
  );

  // Mock SMS gateway — replace with real WhatsApp API when available.
  console.info(`[otp] -> ${phoneNumber}: ${code} (expires ${expiresAt.toISOString()})`);

  res.status(200).json({ message: "OTP sent via WhatsApp." });
});

/**
 * POST /api/auth/whatsapp/verify
 * Validates the OTP. If the user doesn't exist yet (first verification),
 * creates one with the default Buyer role. Returns a signed JWT.
 */
export const verifyOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { phoneNumber, otp, name } = req.body as VerifyOtpBody;
  if (!phoneNumber || !otp) {
    res.status(400).json({ error: "phoneNumber and otp are required." });
    return;
  }

  const user = await User.findOne({ phoneNumber }).select("+whatsappOtp +otpExpiresAt");
  if (!user || !user.whatsappOtp || !user.otpExpiresAt) {
    res.status(400).json({ error: "No active OTP for this phone number. Request a new one." });
    return;
  }
  if (user.otpExpiresAt.getTime() < Date.now()) {
    res.status(400).json({ error: "OTP expired. Request a new one." });
    return;
  }
  if (user.whatsappOtp !== otp) {
    res.status(400).json({ error: "Invalid OTP." });
    return;
  }

  // First-time verification → materialise the Buyer account if not yet set up.
  if (!user.name) {
    user.name = name?.trim() || "New Buyer";
    user.role = user.role || UserRoleEnum.Buyer;
  }

  // Clear the OTP fields so they can't be replayed.
  user.whatsappOtp = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  const token = signToken({
    userId: user._id.toString(),
    role: user.role,
  });

  res.status(200).json({
    message: "Authentication successful.",
    token,
    user: {
      id: user._id,
      phoneNumber: user.phoneNumber,
      name: user.name,
      role: user.role,
    },
  });
});

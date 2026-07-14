import { Router } from "express";
import { sendOtp, verifyOtp } from "../controllers/authController.js";

const router = Router();

// POST /api/auth/whatsapp/send  — request an OTP
router.post("/whatsapp/send", sendOtp);

// POST /api/auth/whatsapp/verify — verify OTP and receive JWT
router.post("/whatsapp/verify", verifyOtp);

export default router;

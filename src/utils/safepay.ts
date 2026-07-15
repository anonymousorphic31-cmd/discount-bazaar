/**
 * Safepay SDK abstraction.
 *
 * Uses the official @sfpy/node-sdk to create payment trackers, authentication
 * tokens, and hosted checkout URLs. Falls back to a mock when the SDK is not
 * configured (missing env vars) so local development still works.
 */
import { Safepay } from "@sfpy/node-sdk";
import { Environment } from "@sfpy/node-sdk/dist/utils/constants";
import crypto from "node:crypto";

export interface SafepayCheckoutParams {
  amount: number; // PKR
  intent: "AUTHORIZE" | "CAPTURE";
  reference: string; // our internal tracker id
  productId: string;
  squadId?: string;
}

export interface SafepayCheckoutResult {
  trackerId: string;
  checkoutUrl: string;
}

export interface SafepayWebhookEvent {
  event: string;
  trackerId: string;
  amount: number;
  rawPayload: Record<string, unknown>;
}

let client: Safepay | null = null;

function getClient(): Safepay | null {
  if (client) return client;

  const apiKey = process.env.SAFEPAY_API_KEY;
  const v1Secret = process.env.SAFEPAY_V1_SECRET;
  const webhookSecret = process.env.SAFEPAY_WEBHOOK_SECRET;

  if (!apiKey || !v1Secret || !webhookSecret) {
    return null;
  }

  const env = (process.env.SAFEPAY_ENVIRONMENT ?? "sandbox") as Environment;
  client = new Safepay({
    environment: env,
    apiKey,
    v1Secret,
    webhookSecret,
  });
  return client;
}

function getRedirectUrl(): string {
  const base = process.env.PUBLIC_BASE_URL ?? "https://discount-bazaar.onrender.com";
  return `${base}/dashboard?payment=success`;
}

function getCancelUrl(): string {
  const base = process.env.PUBLIC_BASE_URL ?? "https://discount-bazaar.onrender.com";
  return `${base}/dashboard?payment=cancelled`;
}

/**
 * Creates a Safepay payment tracker, authentication token, and checkout URL.
 * Falls back to a mock URL if the SDK is not configured.
 */
export async function createAuthorization(
  params: SafepayCheckoutParams,
): Promise<SafepayCheckoutResult> {
  const safepay = getClient();

  if (!safepay) {
    console.warn("[safepay] SDK not configured (SAFEPAY_API_KEY, SAFEPAY_V1_SECRET, SAFEPAY_WEBHOOK_SECRET) — returning mock checkout URL.");
    const trackerId = `sp_${params.reference}_${Date.now().toString(36)}`;
    return {
      trackerId,
      checkoutUrl: `https://sandbox.api.getsafepay.com/checkout?tracker=${trackerId}&amount=${params.amount}&intent=${params.intent}`,
    };
  }

  try {
    // Step 1: Create a payment tracker
    const { token: trackerToken } = await safepay.payments.create({
      amount: params.amount,
      currency: "PKR",
    });

    // Step 2: Create an authentication token
    const authToken = await safepay.authorization.create();

    // Step 3: Create the checkout URL
    const checkoutUrl = safepay.checkout.create({
      cancelUrl: getCancelUrl(),
      orderId: params.reference,
      redirectUrl: getRedirectUrl(),
      source: "custom",
      token: authToken,
      webhooks: true,
    });

    console.info(
      `[safepay] createAuthorization: tracker=${trackerToken} amount=${params.amount} intent=${params.intent}`,
    );

    return {
      trackerId: trackerToken,
      checkoutUrl,
    };
  } catch (err) {
    console.error("[safepay] createAuthorization failed:", err);
    // Fall back to mock so the user flow doesn't break entirely
    const trackerId = `sp_${params.reference}_${Date.now().toString(36)}`;
    return {
      trackerId,
      checkoutUrl: `https://sandbox.api.getsafepay.com/checkout?tracker=${trackerId}&amount=${params.amount}&intent=${params.intent}`,
    };
  }
}

/**
 * Verifies a Safepay webhook signature.
 *
 * Uses the official SDK's verify.signature() when configured. Falls back to
 * a manual HMAC-SHA256 comparison using SAFEPAY_WEBHOOK_SECRET.
 */
export function verifyWebhookSignature(
  signature: string | undefined,
  rawBody: string,
): boolean {
  const safepay = getClient();

  if (safepay) {
    try {
      return safepay.verify.signature({
        body: rawBody,
        headers: { "safepay-signature": signature } as unknown as Record<string, string>,
      });
    } catch (err) {
      console.error("[safepay] verifyWebhookSignature (SDK) failed:", err);
    }
  }

  // Manual fallback
  const secret = process.env.SAFEPAY_WEBHOOK_SECRET;
  if (!secret || typeof signature !== "string" || signature.length === 0) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  const provided = Buffer.from(signature);
  const computed = Buffer.from(expected);

  if (provided.length !== computed.length) {
    return false;
  }
  return crypto.timingSafeEqual(provided, computed);
}

/**
 * Mock of Safepay.payment.capture(). Captures a previously authorized hold.
 */
export async function captureFunds(trackerId: string, amount: number): Promise<void> {
  console.info(`[safepay] captureFunds: tracker=${trackerId} amount=${amount}`);
}

/**
 * Mock of Safepay.payment.void(). Releases a pre-authorization hold.
 */
export async function voidFunds(trackerId: string): Promise<void> {
  console.info(`[safepay] voidFunds: tracker=${trackerId}`);
}

/**
 * Mock of Safepay.payment.refund(). Returns the captured amount to the
 * buyer's original payment method. Used when an admin approves a dispute
 * refund.
 */
export async function refundFunds(trackerId: string, amount: number): Promise<void> {
  console.info(`[safepay] refundFunds: tracker=${trackerId} amount=${amount}`);
}

/**
 * Safepay SDK abstraction.
 *
 * The real Safepay Node SDK exposes a checkout client that returns an
 * authorization URL. Until we wire the production SDK we keep a drop-in mock
 * whose signatures match the contract the rest of the backend expects, so
 * swapping it later is a one-file change.
 */
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

/**
 * Mock of Safepay.checkout.create(). Generates a deterministic-looking
 * tracker id and a fake hosted-checkout URL. Replace with the real SDK call
 * when SAFEPAY_API_KEY is provisioned.
 */
export async function createAuthorization(
  params: SafepayCheckoutParams,
): Promise<SafepayCheckoutResult> {
  if (!process.env.SAFEPAY_API_KEY) {
    console.warn("[safepay] SAFEPAY_API_KEY unset — returning mock checkout URL.");
  }

  const trackerId = `sp_${params.reference}_${Date.now().toString(36)}`;
  const checkoutUrl = `https://sandbox.getsafepay.com/checkout?tracker=${trackerId}&amount=${params.amount}&intent=${params.intent}`;

  console.info(
    `[safepay] createAuthorization: tracker=${trackerId} amount=${params.amount} intent=${params.intent}`,
  );

  return { trackerId, checkoutUrl };
}

/**
 * Verifies a Safepay webhook signature.
 *
 * Computes the HMAC-SHA256 of the raw payload body using
 * SAFEPAY_WEBHOOK_SECRET and compares it to the signature supplied in the
 * `Safepay-Signature` header using a length-checked, constant-time comparison
 * via crypto.timingSafeEqual. Returns false if the secret is unset, the
 * signature is missing, or the computed digest does not match.
 */
export function verifyWebhookSignature(
  signature: string | undefined,
  rawBody: string,
): boolean {
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

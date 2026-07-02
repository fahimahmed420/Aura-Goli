/** Shared types for the courier automation layer. */

export type CourierId = "steadfast" | "pathao";

export interface ParcelInput {
  /** Our order number — used as the courier-side invoice/merchant order id. */
  invoice: string;
  recipientName: string;
  recipientPhone: string;
  /** Full street address (house, road, area). */
  recipientAddress: string;
  /** City / district as typed at checkout. */
  recipientCity: string;
  /** Amount to collect at the door. 0 for prepaid orders. */
  codAmount: number;
  itemQuantity: number;
  itemDescription: string;
  note?: string;
}

export interface DispatchResult {
  ok: boolean;
  courier: CourierId;
  consignmentId?: string;
  trackingCode?: string;
  /** Courier-side initial status, e.g. "in_review" / "Pending". */
  status?: string;
  error?: string;
}

export interface CourierStatusResult {
  ok: boolean;
  /** Raw courier-side status string. */
  status?: string;
  /** Our normalized mapping, when the courier status is terminal. */
  normalized?: "delivered" | "cancelled" | null;
  error?: string;
}

export type RiskVerdict = "good" | "neutral" | "risky" | "prepaid";

export interface RiskAssessment {
  verdict: RiskVerdict;
  reason: string;
  deliveredCount: number;
  cancelledCount: number;
  /** "store-history" | "external" | "prepaid" */
  source: string;
}

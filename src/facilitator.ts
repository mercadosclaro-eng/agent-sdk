/**
 * Facilitator client — talks to the x402 facilitator (default
 * https://x402.0xgasless.com). Two endpoints we care about:
 *
 *   POST /verify  → cheap signature + policy check, no on-chain submit
 *   POST /settle  → submits the EIP-3009 transferWithAuthorization on-chain.
 *                   The facilitator pays the gas.
 *
 * You normally don't call these directly — the X402Api.pay() helper does
 * the sign + settle for you. This is here for advanced users that have
 * a signed payload from elsewhere (e.g. another agent platform).
 */
import type {
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
  VerifyResponse,
} from './types.js';

export interface FacilitatorOpts {
  baseUrl: string;
  fetch:   typeof fetch;
}

export class FacilitatorApi {
  constructor(private readonly opts: FacilitatorOpts) {}

  /** Verify a payment without spending gas. */
  verify(paymentPayload: PaymentPayload, paymentRequirements: PaymentRequirements): Promise<VerifyResponse> {
    return this.call<VerifyResponse>('/verify', { paymentPayload, paymentRequirements });
  }

  /** Submit on-chain. Returns the tx hash on success. */
  settle(paymentPayload: PaymentPayload, paymentRequirements: PaymentRequirements): Promise<SettleResponse> {
    return this.call<SettleResponse>('/settle', { paymentPayload, paymentRequirements });
  }

  private async call<T>(path: string, body: unknown): Promise<T> {
    const res = await this.opts.fetch(`${this.opts.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => undefined)) as any;
    if (!res.ok) {
      const msg = data?.errorReason || data?.invalidReason || data?.error || `facilitator ${path} HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data as T;
  }
}

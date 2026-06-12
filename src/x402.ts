/**
 * x402 resource — wraps the canonical sign Lambda and adds the convenience
 * `pay()` helper that signs + settles in one call.
 *
 *   POST /v1/agent/x402/sign  (Lambda — policy-enforced)
 *   POST /settle              (facilitator — submits on-chain)
 *
 * Common usage:
 *
 *     await client.x402.pay({ agentId: 'bot-1', to: '0x…', value: '500000' });
 *     // → returns { signed, settle: { transaction, blockNumber, … } }
 *
 * Or hand-roll the two steps for advanced flows:
 *
 *     const signed = await client.x402.sign({ … });
 *     const r = await client.facilitator.settle(signed.paymentPayload, signed.paymentRequirements);
 */
import type { Http } from './http.js';
import type { FacilitatorApi } from './facilitator.js';
import type {
  PayInput,
  PayResult,
  SignX402Input,
  SignX402Response,
} from './types.js';

export class X402Api {
  constructor(
    private readonly http: Http,
    private readonly facilitator: FacilitatorApi,
  ) {}

  /** Sign a TransferWithAuthorization. Policy checks happen here — caps, allowed tokens/chains, daily spend. */
  sign(input: SignX402Input): Promise<SignX402Response> {
    return this.http.post('/v1/agent/x402/sign', input);
  }

  /**
   * Sign and (by default) immediately settle on-chain via the facilitator.
   * Pass `settle: false` to get the signed payload only — useful if you
   * want to forward it to a different facilitator or queue it.
   */
  async pay(input: PayInput): Promise<PayResult> {
    const { settle = true, ...signInput } = input;
    const signed = await this.sign(signInput);
    if (!settle) return { agentId: signed.agentId, signed };
    const settleResult = await this.facilitator.settle(signed.paymentPayload, signed.paymentRequirements);
    return { agentId: signed.agentId, signed, settle: settleResult };
  }
}

/**
 * Identity resource — ERC-8004 on-chain identity registration.
 *
 *   POST /v1/agent/identity/link  → Lambda → facilitator → IdentityRegistry.register()
 *   GET  /identity/info           (facilitator) → list of chains + sponsor addresses
 *
 * `link()` is idempotent per (agent, chain): if the agent already has an
 * identity on the requested chain, the existing record comes back with
 * `alreadyRegistered: true` and no new tx is submitted.
 *
 * The NFT is minted to the facilitator's sponsor wallet (so the agent
 * itself doesn't need any native gas). The agent's EOA is captured in the
 * on-chain `agentURI` metadata (a base64-encoded data URL).
 */
import type { Http } from './http.js';
import type { IdentityInfo, IdentityLinkInput, IdentityLinkResult } from './types.js';

export class IdentityApi {
  constructor(
    private readonly http: Http,
    private readonly facilitatorUrl: string,
    private readonly fetchFn: typeof fetch,
  ) {}

  /** Register the agent on the ERC-8004 IdentityRegistry for the given chain (gas paid by 0xgas). */
  link(input: IdentityLinkInput): Promise<IdentityLinkResult> {
    return this.http.post('/v1/agent/identity/link', input);
  }

  /** Read the facilitator's identity capability — which chains support registration + the sponsor wallet addresses. */
  async info(): Promise<IdentityInfo> {
    const res = await this.fetchFn(`${this.facilitatorUrl.replace(/\/$/, '')}/identity/info`);
    if (!res.ok) {
      throw new Error(`facilitator /identity/info HTTP ${res.status}`);
    }
    return (await res.json()) as IdentityInfo;
  }
}

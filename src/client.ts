/**
 * OxGasAgent — main client.
 *
 *     import { OxGasAgent } from '@0xgasless/agent';
 *
 *     const client = new OxGasAgent({ apiKey: process.env.OXGAS_API_KEY! });
 *
 *     await client.policy.enableX402();
 *     const agent = await client.agents.create({ agentId: 'trading-bot-1' });
 *     await client.x402.pay({ agentId: agent.agentId, to: '0xMerchant…', value: '500000' });
 *
 * Resource modules:
 *   .agents       — CRUD for agent wallets (create/list/get/balance/revoke)
 *   .policy       — read/set project default + per-agent overrides
 *   .x402         — sign + pay
 *   .identity     — ERC-8004 on-chain identity (register/link)
 *   .reputation   — ERC-8004 trust score (read + leave feedback)  [Lever #2]
 *   .validation   — ERC-8004 bonded validation (request/respond/challenge)  [Lever #1]
 *   .facilitator  — direct verify/settle (advanced)
 */
import { AgentsApi } from './agents.js';
import { PolicyApi } from './policy.js';
import { X402Api } from './x402.js';
import { FacilitatorApi } from './facilitator.js';
import { IdentityApi } from './identity.js';
import { ReputationApi } from './reputation.js';
import { ValidationApi } from './validation.js';
import { makeHttp } from './http.js';
import { AgentConfigError } from './errors.js';
import type { ClientConfig } from './types.js';

const DEFAULT_API_URL         = 'https://pmwv2d8iwa.execute-api.eu-north-1.amazonaws.com';
const DEFAULT_FACILITATOR_URL = 'https://x402.0xgasless.com';

export class OxGasAgent {
  readonly agents:      AgentsApi;
  readonly policy:      PolicyApi;
  readonly x402:        X402Api;
  readonly identity:    IdentityApi;
  readonly reputation:  ReputationApi;
  readonly validation:  ValidationApi;
  readonly facilitator: FacilitatorApi;

  /** Useful for diagnostics + logs. */
  readonly apiUrl:         string;
  readonly facilitatorUrl: string;

  constructor(config: ClientConfig) {
    if (!config?.apiKey) {
      throw new AgentConfigError(
        'apiKey is required. Get one from the 0xgas dashboard (Project → Auth → API Key).',
      );
    }

    const fetchFn = config.fetch ?? globalThis.fetch;
    if (typeof fetchFn !== 'function') {
      throw new AgentConfigError(
        'No fetch implementation found. Use Node 18+ or pass `fetch` in the config (e.g. node-fetch).',
      );
    }

    this.apiUrl         = config.apiUrl         ?? DEFAULT_API_URL;
    this.facilitatorUrl = config.facilitatorUrl ?? DEFAULT_FACILITATOR_URL;

    const http = makeHttp({ baseUrl: this.apiUrl, apiKey: config.apiKey, fetch: fetchFn });
    this.facilitator = new FacilitatorApi({ baseUrl: this.facilitatorUrl, fetch: fetchFn });
    this.agents     = new AgentsApi(http);
    this.policy     = new PolicyApi(http);
    this.x402       = new X402Api(http, this.facilitator);
    this.identity   = new IdentityApi(http, this.facilitatorUrl, fetchFn);
    this.reputation = new ReputationApi(http);
    this.validation = new ValidationApi(http);
  }
}

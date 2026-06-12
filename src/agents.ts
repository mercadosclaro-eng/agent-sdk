/**
 * Agents resource — wraps the agent CRUD Lambdas:
 *   POST /v1/agent/create
 *   GET  /v1/agent/list
 *   GET  /v1/agent/get
 *   GET  /v1/agent/balance
 *   POST /v1/agent/revoke
 */
import type { Http } from './http.js';
import type {
  ActivityResponse,
  Agent,
  BalanceResponse,
  CreateAgentInput,
  ListAgentsOptions,
  ListAgentsResponse,
} from './types.js';

export class AgentsApi {
  constructor(private readonly http: Http) {}

  /** Create a new agent wallet. Idempotent on `agentId`. */
  create(input: CreateAgentInput): Promise<Agent & { existing?: boolean }> {
    return this.http.post('/v1/agent/create', input);
  }

  /** List agents in the API key's project. */
  list(opts: ListAgentsOptions = {}): Promise<ListAgentsResponse> {
    return this.http.get('/v1/agent/list', {
      status: opts.status ?? 'all',
      limit:  opts.limit,
      cursor: opts.cursor,
    });
  }

  /** Fetch a single agent by id. */
  get(agentId: string): Promise<Agent> {
    return this.http.get('/v1/agent/get', { agentId });
  }

  /**
   * Read on-chain USDC balance for the agent.
   * Pass `chain: 'all'` to query every chain in the agent's policy.
   */
  getBalance(agentId: string, opts: { chain?: string } = {}): Promise<BalanceResponse> {
    return this.http.get('/v1/agent/balance', { agentId, chain: opts.chain });
  }

  /**
   * Terminally revoke an agent. After this, the sign Lambda refuses to
   * sign anything for this agentId. Pre-signed authorizations that have
   * not yet been settled may still be redeemed by their holders until
   * their validBefore expires — revocation can't recall them.
   */
  revoke(agentId: string): Promise<{ agentId: string; status: 'revoked'; address: string; revokedAt: string; alreadyRevoked?: boolean }> {
    return this.http.post('/v1/agent/revoke', { agentId });
  }

  /**
   * Recent x402 activity for an agent — verify + settle rows from the
   * facilitator audit log. Defaults to the last 7 days, max 30. limit
   * caps each list (verifies / settlements) independently.
   */
  activity(agentId: string, opts: { days?: number; limit?: number } = {}): Promise<ActivityResponse> {
    return this.http.get('/v1/agent/activity', { agentId, days: opts.days, limit: opts.limit });
  }
}

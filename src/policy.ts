/**
 * Policy resource — wraps the agent-policy Lambdas:
 *   GET  /v1/agent/policy[?agentId=]
 *   POST /v1/agent/policy/set
 *
 * The hierarchy enforced server-side is:
 *   tier max  ⊇  project default  ⊇  per-agent override
 *
 * Numeric caps you set are silently clamped down to the next ceiling.
 */
import type { Http } from './http.js';
import type {
  AgentPolicy,
  PolicyView,
  SetPolicyInput,
} from './types.js';

export class PolicyApi {
  constructor(private readonly http: Http) {}

  /** Read project policy + tier ceiling. If agentId is given, includes that agent's effective policy too. */
  get(agentId?: string): Promise<PolicyView> {
    return this.http.get('/v1/agent/policy', { agentId });
  }

  /** Low-level setter — pass the full SetPolicyInput shape. Prefer the helpers below for the common cases. */
  set(input: SetPolicyInput): Promise<unknown> {
    return this.http.post('/v1/agent/policy/set', input);
  }

  /** Enable x402 for the project. Required before any agent can be created. */
  enableX402(): Promise<unknown> {
    return this.set({ scope: 'project', x402Enabled: true });
  }

  /** Disable x402 — existing agents stay but can't sign new payments. */
  disableX402(): Promise<unknown> {
    return this.set({ scope: 'project', x402Enabled: false });
  }

  /** Set the default policy inherited by all new agents in the project. */
  setProjectDefault(policy: Partial<AgentPolicy>): Promise<unknown> {
    return this.set({ scope: 'project', policy });
  }

  /** Override the policy for a single agent. Clamped to project default + tier max. */
  setAgent(agentId: string, policy: Partial<AgentPolicy>): Promise<unknown> {
    return this.set({ scope: 'agent', agentId, policy });
  }
}

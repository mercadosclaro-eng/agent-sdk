/**
 * @0xgasless/agent — public entry point.
 *
 * The default export is `OxGasAgent`. Types are exported individually
 * for callers that need to type their own variables.
 */
export { OxGasAgent } from './client.js';
export { AgentsApi } from './agents.js';
export { PolicyApi } from './policy.js';
export { X402Api } from './x402.js';
export { FacilitatorApi } from './facilitator.js';
export { IdentityApi } from './identity.js';
export { AgentApiError, AgentConfigError } from './errors.js';

export type {
  ActivityResponse,
  ActivityRow,
  Agent,
  AgentPolicy,
  AgentStatus,
  BalanceEntry,
  BalanceResponse,
  Chain,
  ClientConfig,
  CreateAgentInput,
  CustodyType,
  IdentityInfo,
  IdentityLinkInput,
  IdentityLinkResult,
  IdentityRecord,
  ListAgentsOptions,
  ListAgentsResponse,
  OnchainIdentity,
  PayInput,
  PayResult,
  PaymentAuthorization,
  PaymentPayload,
  PaymentRequirements,
  PolicyView,
  SetPolicyInput,
  SettleResponse,
  SignX402Input,
  SignX402Response,
  Tier,
  TierMax,
  VerifyResponse,
} from './types.js';

/**
 * Public types for @0xgasless/agent.
 *
 * Mirrors the JSON shapes returned by the 0xgas Lambda API. If you change
 * a field here, also confirm the Lambda response matches.
 */

export type Chain = 'avalanche' | 'avalanche-fuji' | 'fuji' | 'base';
export type AgentStatus = 'active' | 'paused' | 'revoked';
export type Tier = 'free' | 'builder' | 'enterprise';
export type CustodyType = 'hd' | 'kms';

export interface AgentPolicy {
  perTxCapUSD?:           number | null;
  perDayCapUSD?:          number | null;
  allowedTokens?:         string[];
  allowedChains?:         string[];
  requireMainnetCredit?:  boolean;
}

export interface Agent {
  agentId:       string;
  projectId:     string;
  address:       string;
  displayName?:  string;
  chain:        string;
  custodyType:  CustodyType;
  tierAtCreate: Tier;
  status:       AgentStatus;
  policy:       AgentPolicy;
  identity?:    OnchainIdentity | null;
  createdAt:    string;
  updatedAt?:   string;
  revokedAt?:   string;
}

/** ERC-8004 identity link (when present). */
export interface OnchainIdentity {
  agentTokenId?: string;
  domain?:       string;
  chain?:        string;
  txHash?:       string;
}

export interface CreateAgentInput {
  agentId:      string;
  displayName?: string;
  chain?:       string;
}

export interface ListAgentsOptions {
  status?: 'active' | 'paused' | 'revoked' | 'all';
  limit?:  number;
  cursor?: string;
}

export interface ListAgentsResponse {
  agents:      Agent[];
  count:       number;
  projectId:   string;
  nextCursor?: string;
}

/** Per-chain USDC balance reading. */
export interface BalanceEntry {
  usdc?:     string;     // formatted decimal "1.234567"
  atomic?:   string;     // uint256 in smallest units
  chainId?:  number;
  token?:    string;
  symbol?:   string;
  decimals?: number;
  error?:    string;
}

export interface BalanceResponse {
  agentId:   string;
  address:   string;
  projectId: string;
  balances:  Record<string, BalanceEntry>;
}

export interface TierMax {
  maxAgents:            number | null;
  perTxCapUSD:          number | null;
  perDayCapUSD:         number | null;
  allowedTokens:        string[];
  allowedChains:        string[];
  requireMainnetCredit: boolean;
}

export interface PolicyView {
  projectId: string;
  tier:      Tier;
  tierMax:   TierMax;
  project: {
    x402Enabled:        boolean;
    agentPolicyDefault: AgentPolicy;
  };
  agent?: {
    agentId:      string;
    address:      string;
    displayName:  string;
    chain:        string;
    status:       AgentStatus;
    tierAtCreate: Tier;
    policy:       AgentPolicy;
  };
}

/** Body shape for POST /v1/agent/policy/set. Caller passes scope='project' OR scope='agent'+agentId. */
export type SetPolicyInput =
  | { scope: 'project'; x402Enabled?: boolean; policy?: Partial<AgentPolicy> }
  | { scope: 'agent'; agentId: string; policy: Partial<AgentPolicy> };

/** Canonical x402 payment payload returned by the sign Lambda. */
export interface PaymentAuthorization {
  from:        string;
  to:          string;
  value:       string;   // uint256 atomic units
  validAfter:  number;
  validBefore: number;
  nonce:       string;   // 0x + 64 hex
}

export interface PaymentPayload {
  token: string;
  payload: {
    authorization: PaymentAuthorization;
    signature:     string;
  };
}

export interface PaymentRequirements {
  network:           string;
  chainId:           number;
  relayerContract?:  string;
}

export interface SignX402Input {
  agentId:      string;
  to:           string;
  /** atomic units string, e.g. "1500000" for 1.5 USDC. */
  value:        string;
  tokenSymbol?: string;          // default 'USDC'
  chain?:       string;          // default = agent's stored chain
  validBefore?: number;
  nonce?:       string;
}

export interface SignX402Response {
  payerAddress:        string;
  paymentPayload:      PaymentPayload;
  paymentRequirements: PaymentRequirements;
  agentId:             string;
  tokenSymbol:         string;
  chain:               string;
  policy: {
    perTxCapUSD:       number | null;
    perDayCapUSD:      number | null;
    spentTodayUSD:     string;
    remainingTodayUSD: string | null;
  };
}

export interface VerifyResponse {
  isValid:        boolean;
  payer?:         string;
  invalidReason?: string;
}

export interface SettleResponse {
  success:      boolean;
  transaction?: string;
  network?:     string;
  payer?:       string;
  blockNumber?: number;
  errorReason?: string;
}

export interface PayInput extends SignX402Input {
  /** When true (default), sign + immediately settle via the facilitator. */
  settle?: boolean;
}

export interface PayResult {
  agentId:    string;
  signed:     SignX402Response;
  settle?:    SettleResponse;
}

// ── Activity (audit log query) ──────────────────────────────────────────

export interface ActivityRow {
  sk?:                  string;
  payer?:               string;
  recipient?:           string;
  token?:               string;
  token_symbol?:        string;
  amount?:              string;
  amount_formatted?:    string;
  nonce?:               string;
  network?:             string;
  chain_id?:            number;
  is_valid?:            boolean;
  invalid_reason?:      string | null;
  transaction_hash?:    string;
  block_number?:        number;
  gas_used?:            string;
  success?:             boolean;
  error_reason?:        string | null;
  timestamp?:           string;
  duration_ms?:         number;
  transaction_time_ms?: number;
  total_time_ms?:       number;
}

export interface ActivityResponse {
  agentId:       string;
  address:       string;
  daysQueried:   number;
  chainsQueried: string[];
  asOf:          string;
  summary: {
    verifyCount:           number;
    settlementCount:       number;
    successfulSettlements: number;
    spentTotalUSD:         string;
  };
  verifies:    ActivityRow[];
  settlements: ActivityRow[];
}

// ── ERC-8004 identity ───────────────────────────────────────────────────

export interface IdentityRecord {
  agentTokenId: string;
  chain:        string;
  chainId:      number;
  txHash:       string;
  blockNumber:  number;
  registry:     string;
  owner:        string;     // sponsor wallet that received the NFT
  agentURI:     string;
  registeredAt: string;
}

export interface IdentityLinkInput {
  agentId: string;
  chain?:  string;          // default = agent's stored chain
}

export interface IdentityLinkResult extends IdentityRecord {
  agentId:           string;
  address:           string;
  alreadyRegistered: boolean;
}

export interface IdentityInfo {
  sponsoredRegistration: string;       // 'enabled' | 'disabled (…)'
  chains: Array<{
    chain:    string;
    chainId:  number;
    registry: string;
    sponsor:  string;
    explorer: string;
  }>;
}

export interface ClientConfig {
  apiKey:           string;
  /** Default: https://pmwv2d8iwa.execute-api.eu-north-1.amazonaws.com */
  apiUrl?:          string;
  /** Default: https://x402.0xgasless.com */
  facilitatorUrl?:  string;
  /** Default: globalThis.fetch (Node 18+). Pass node-fetch for older runtimes. */
  fetch?:           typeof fetch;
}

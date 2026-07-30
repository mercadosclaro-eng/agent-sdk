/**
 * Public types for @0xgasless/agent.
 *
 * Mirrors the JSON shapes returned by the 0xgas Lambda API. If you change
 * a field here, also confirm the Lambda response matches.
 */

export type Chain =
  | 'avalanche' | 'avalanche-fuji' | 'fuji' | 'base'   // EVM (secp256k1)
  | 'solana' | 'solana-devnet';                        // SVM (ed25519)

/** EVM chains settle EIP-3009; Solana chains settle the exact-SVM scheme. */
export type ChainFamily = 'evm' | 'svm';
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

// ── x402 payment payloads ───────────────────────────────────────────────
// Two chain families produce structurally different payloads. Both are opaque
// to the SDK (sign → settle passthrough), but typed here so callers can narrow.

/** EVM: an EIP-3009 TransferWithAuthorization (from the token's own domain). */
export interface PaymentAuthorization {
  from:        string;
  to:          string;
  value:       string;   // uint256 atomic units
  validAfter:  number;
  validBefore: number;
  nonce:       string;   // 0x + 64 hex
}

export interface EvmPaymentPayload {
  token: string;                    // 0x token address
  payload: {
    authorization: PaymentAuthorization;
    signature:     string;          // 0x EIP-712 signature
  };
}

/** Solana (exact-SVM): a base64 partially-signed versioned transaction. */
export interface SvmPaymentPayload {
  token: string;                    // base58 SPL mint
  payload: {
    transaction: string;            // base64 tx (agent-signed; facilitator co-signs as fee payer)
  };
}

export type PaymentPayload = EvmPaymentPayload | SvmPaymentPayload;

/** Type guard: narrow a payload to the Solana (exact-SVM) shape. */
export function isSvmPayload(p: PaymentPayload): p is SvmPaymentPayload {
  return typeof (p as any)?.payload?.transaction === 'string';
}

export interface EvmPaymentRequirements {
  network:           string;
  chainId:           number;
  relayerContract?:  string;
}

/** Solana requirements: CAIP-2 network, mint, recipient, and the fee payer. */
export interface SvmPaymentRequirements {
  network:   string;   // CAIP-2, e.g. 'solana:5eykt4Us...'
  asset:     string;   // base58 SPL mint
  payTo:     string;   // recipient wallet (base58)
  feePayer:  string;   // facilitator fee payer (base58)
}

export type PaymentRequirements = EvmPaymentRequirements | SvmPaymentRequirements;

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
  /** Solana only: the source/destination Associated Token Accounts. */
  sourceAta?:          string;
  destAta?:            string;
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

// ── ERC-8004 reputation (Lever #2 — the trust score) ────────────────────

export interface GetScoreOptions {
  chain?: string;
  /** Bring-your-own trust circle: restrict the score to these reviewer addresses. */
  clients?: string[];
  /** Only count endorsements carrying this tag (e.g. 'price-data'). */
  tag?: string;
}

/**
 * The computed trust score. `score` is the 4-lens weighted result; `basis`
 * tells you honestly what backs it (see COMPLETE_STACK_ARCHITECTURE.md).
 */
export interface ReputationScore {
  agentId:       string;
  chain:         string;
  score:         number;   // 0..100 composite
  confidence:    number;   // 0..1 — how much data backs the score
  basis:         'bonded' | 'mixed' | 'opinion-only';
  bondedCount:   number;   // # of bonded successes counted (Lever #1 facts)
  feedbackCount: number;   // # of raw opinions counted
  breakdown: {
    independence:        number;  // Lens 1 — who said it
    recency:             number;  // Lens 2 — when
    bondedness:          number;  // Lens 3 — skin in the game
    verificationDensity: number;  // Lens 4 — how well-watched
  };
  asOf: string;
}

export interface FeedbackEntry {
  agentId:    string;
  client:     string;   // reviewer address
  index:      number;
  value:      number;   // signed; positive = good
  tag1?:      string;
  tag2?:      string;
  bonded:     boolean;  // backed by a bonded validation?
  revoked:    boolean;
  createdAt?: string;
}

export interface ListFeedbackOptions {
  clients?: string[];
  tag?:     string;
  chain?:   string;
  limit?:   number;
  cursor?:  string;
}

export interface ListFeedbackResponse {
  agentId:     string;
  entries:     FeedbackEntry[];
  count:       number;
  nextCursor?: string;
}

export interface GiveFeedbackInput {
  /** Agent being reviewed. */
  agentId:      string;
  /** Reviewer — must be a different agent (self-review is rejected on-chain). */
  fromAgentId:  string;
  /** e.g. +100 (good) or -100 (bad). */
  value:        number;
  tag1?:        string;
  tag2?:        string;
  feedbackURI?: string;
  chain?:       string;
}

export interface GiveFeedbackResult {
  agentId: string;
  client:  string;
  index:   number;
  txHash?: string;
}

// ── ERC-8004 validation (Lever #1 — the bonded gate) ────────────────────

export type ValidationStatus =
  | 'requested'   // waiting on the validator
  | 'responded'   // validator answered; challenge window open
  | 'disputed'    // someone challenged; awaiting the resolver
  | 'finalized'   // survived the window → BONDED SUCCESS
  | 'slashed'     // proven wrong → validator stake slashed
  | 'dismissed'   // challenge failed → validator paid
  | 'expired';    // validator never answered

export interface ValidationRequest {
  requestId:          string;
  validatorId:        string;
  agentId:            string;   // agent whose work is validated
  dataHash:           string;
  dataURI?:           string;
  chain:              string;
  reward:             string;   // atomic units, paid to validator
  status:             ValidationStatus;
  score?:             number;   // 0..100 (once responded)
  success?:           boolean;
  evidenceURI?:       string;
  challengeDeadline?: string;   // ISO time the window closes
  bonded:             boolean;  // true once finalized (survived scrutiny)
  createdAt:          string;
  updatedAt?:         string;
}

export interface RequestValidationInput {
  /** Agent whose work is being validated (usually your own agent). */
  agentId:     string;
  /** Validator you're asking to certify the work. */
  validatorId: string;
  /** Hash committing to the exact data/claim being validated. */
  dataHash:    string;
  /** Where the full data lives — must stay available through the challenge window. */
  dataURI?:    string;
  /** Reward paid to the validator, atomic units. */
  reward:      string;
  chain?:      string;
}

export interface RespondValidationInput {
  requestId:    string;
  validatorId:  string;
  /** 0..100. `success` defaults to score >= 50. */
  score:        number;
  success?:     boolean;
  evidenceURI?: string;
  chain?:       string;
}

export interface ChallengeValidationInput {
  requestId:          string;
  /** The agent raising the challenge. */
  challengerId:       string;
  /** Evidence the validator's answer was wrong. */
  counterEvidenceURI: string;
  chain?:             string;
}

export interface ListValidationsOptions {
  /** Filter by the agent's role in the validation. */
  role?:   'agent' | 'validator';
  status?: ValidationStatus | 'all';
  chain?:  string;
  limit?:  number;
  cursor?: string;
}

export interface ListValidationsResponse {
  validations: ValidationRequest[];
  count:       number;
  nextCursor?: string;
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

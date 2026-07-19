/**
 * Validation resource — ERC-8004 bonded validation (Lever #1, the "hard gate").
 *
 *   POST /v1/agent/validation/request    → ask a validator to certify some work
 *   POST /v1/agent/validation/respond    → validator submits a score + evidence
 *   POST /v1/agent/validation/challenge  → dispute a response inside its window
 *   GET  /v1/agent/validation/get        → read one request + its status
 *   GET  /v1/agent/validation            → list an agent's validations
 *
 * The point of validation is to turn a claim into a BONDED FACT: a validator
 * stakes money, answers, and — once the on-chain challenge/slashing upgrade
 * lands (Lever #1) — can be slashed if a challenger proves them wrong. A
 * request that survives its challenge window comes back with `bonded: true`.
 *
 * HONESTY: until that on-chain upgrade ships, a response attests liveness (the
 * validator answered), NOT correctness. Weight it by the validator's own
 * reputation until `bonded` can be trusted. See COMPLETE_STACK_ARCHITECTURE.md.
 */
import type { Http } from './http.js';
import type {
  ChallengeValidationInput,
  ListValidationsOptions,
  ListValidationsResponse,
  RequestValidationInput,
  RespondValidationInput,
  ValidationRequest,
} from './types.js';

export class ValidationApi {
  constructor(private readonly http: Http) {}

  /** Ask a validator to certify an agent's work. The reward is escrowed until settlement. */
  request(input: RequestValidationInput): Promise<ValidationRequest> {
    return this.http.post('/v1/agent/validation/request', input);
  }

  /** Validator submits a score (0..100) + evidence. Opens the challenge window. */
  respond(input: RespondValidationInput): Promise<ValidationRequest> {
    return this.http.post('/v1/agent/validation/respond', input);
  }

  /** Dispute a validator's response within its challenge window (posts a counter-bond). */
  challenge(input: ChallengeValidationInput): Promise<ValidationRequest> {
    return this.http.post('/v1/agent/validation/challenge', input);
  }

  /** Read one validation request and its current status. */
  get(requestId: string, opts: { chain?: string } = {}): Promise<ValidationRequest> {
    return this.http.get('/v1/agent/validation/get', { requestId, chain: opts.chain });
  }

  /** List validations where the agent is the subject (`role: 'agent'`) or the validator. */
  list(agentId: string, opts: ListValidationsOptions = {}): Promise<ListValidationsResponse> {
    return this.http.get('/v1/agent/validation', {
      agentId,
      role:   opts.role,
      status: opts.status ?? 'all',
      chain:  opts.chain,
      limit:  opts.limit,
      cursor: opts.cursor,
    });
  }
}

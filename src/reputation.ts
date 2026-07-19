/**
 * Reputation resource — ERC-8004 trust scores (Lever #2, the "smart reader").
 *
 *   GET  /v1/agent/reputation           → computed 4-lens trust score
 *   GET  /v1/agent/reputation/feedback  → raw feedback entries behind the score
 *   POST /v1/agent/reputation/feedback  → leave signed feedback → ReputationRegistry.giveFeedback
 *
 * The score is computed OFF-CHAIN by weighting every endorsement through four
 * lenses — independence (who said it), recency (when), skin-in-the-game
 * (bonded > free opinion), and how well-watched it was. The `basis` field on
 * the result tells you honestly what backs the number: 'bonded' (money-at-risk
 * facts), 'mixed', or 'opinion-only'.
 *
 * `clients` on a read is your trust circle — pass the reviewer addresses you
 * already trust and only their endorsements count. Omit it to use the
 * platform's default anchor set.
 */
import type { Http } from './http.js';
import type {
  GetScoreOptions,
  GiveFeedbackInput,
  GiveFeedbackResult,
  ListFeedbackOptions,
  ListFeedbackResponse,
  ReputationScore,
} from './types.js';

export class ReputationApi {
  constructor(private readonly http: Http) {}

  /**
   * Read an agent's computed trust score (0..100). Always check `.basis` and
   * `.confidence` before relying on it — a high score with 'opinion-only'
   * basis and low confidence is not the same as a bonded one.
   */
  getScore(agentId: string, opts: GetScoreOptions = {}): Promise<ReputationScore> {
    return this.http.get('/v1/agent/reputation', {
      agentId,
      chain:   opts.chain,
      clients: opts.clients?.length ? opts.clients.join(',') : undefined,
      tag:     opts.tag,
    });
  }

  /** List the raw feedback entries behind the score (each flagged bonded / revoked). */
  listFeedback(agentId: string, opts: ListFeedbackOptions = {}): Promise<ListFeedbackResponse> {
    return this.http.get('/v1/agent/reputation/feedback', {
      agentId,
      clients: opts.clients?.length ? opts.clients.join(',') : undefined,
      tag:     opts.tag,
      chain:   opts.chain,
      limit:   opts.limit,
      cursor:  opts.cursor,
    });
  }

  /**
   * Leave signed feedback about another agent. Self-review is rejected
   * on-chain, so `fromAgentId` must differ from `agentId`.
   */
  giveFeedback(input: GiveFeedbackInput): Promise<GiveFeedbackResult> {
    return this.http.post('/v1/agent/reputation/feedback', input);
  }
}

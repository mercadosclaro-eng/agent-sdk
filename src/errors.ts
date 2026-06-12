/**
 * Errors thrown by @0xgasless/agent.
 *
 * All API failures throw `AgentApiError`. Inspect `.status` for the HTTP
 * code, `.code` for an app-level identifier (e.g. 'per_tx_cap_exceeded'),
 * and `.body` for the raw JSON the server returned.
 */

export class AgentApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly body?: unknown;

  constructor(message: string, opts: { status: number; code?: string; body?: unknown }) {
    super(message);
    this.name = 'AgentApiError';
    this.status = opts.status;
    this.code = opts.code;
    this.body = opts.body;
  }
}

export class AgentConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentConfigError';
  }
}

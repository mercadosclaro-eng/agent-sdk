/**
 * Tiny HTTP layer used by every resource module.
 *
 * Single responsibility: serialize the URL + body, attach the Bearer
 * header, parse the JSON response, and turn 4xx/5xx into a typed
 * AgentApiError so callers don't have to `if (!res.ok)` everywhere.
 */
import { AgentApiError } from './errors.js';

export interface HttpOpts {
  baseUrl: string;
  apiKey:  string;
  fetch:   typeof fetch;
}

export type Query = Record<string, string | number | boolean | undefined | null>;

function buildUrl(base: string, path: string, query?: Query): string {
  const url = new URL(path.replace(/^\/?/, '/'), base);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function request<T>(
  opts: HttpOpts,
  method: 'GET' | 'POST',
  path: string,
  options: { query?: Query; body?: unknown } = {},
): Promise<T> {
  const url  = buildUrl(opts.baseUrl, path, options.query);
  const init: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${opts.apiKey}`,
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
  };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);

  const res  = await opts.fetch(url, init);
  const text = await res.text();
  let data: any = undefined;
  if (text) {
    try { data = JSON.parse(text); } catch { /* leave undefined */ }
  }

  if (!res.ok) {
    const message = data?.error || data?.message || res.statusText || `HTTP ${res.status}`;
    throw new AgentApiError(message, {
      status: res.status,
      code:   typeof data?.error === 'string' ? data.error : undefined,
      body:   data ?? text,
    });
  }
  return data as T;
}

export function makeHttp(opts: HttpOpts) {
  return {
    get:  <T = unknown>(path: string, query?: Query)                => request<T>(opts, 'GET',  path, { query }),
    post: <T = unknown>(path: string, body?: unknown, query?: Query) => request<T>(opts, 'POST', path, { body, query }),
  };
}

export type Http = ReturnType<typeof makeHttp>;

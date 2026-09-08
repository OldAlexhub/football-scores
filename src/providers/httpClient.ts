import type { ProviderId } from '../types/domain';
import { ProviderError } from './types';

const DEFAULT_TIMEOUT_MS = 12000;

export async function fetchJson<T>(
  providerId: ProviderId,
  url: string,
  options: { headers?: Record<string, string>; timeoutMs?: number } = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { headers: options.headers, signal: controller.signal });
  } catch (error) {
    clearTimeout(timeout);
    if ((error as Error).name === 'AbortError') {
      throw new ProviderError('Request timed out', 'timeout', providerId);
    }
    throw new ProviderError('Network request failed', 'network', providerId);
  }
  clearTimeout(timeout);

  if (response.status === 401) {
    throw new ProviderError('Unauthorized — check the API token', 'unauthorized', providerId, 401);
  }
  if (response.status === 403) {
    throw new ProviderError('Forbidden by provider', 'forbidden', providerId, 403);
  }
  if (response.status === 404) {
    throw new ProviderError('Resource not found', 'not_found', providerId, 404);
  }
  if (response.status === 429) {
    throw new ProviderError('Rate limited by provider', 'rate_limited', providerId, 429);
  }
  if (response.status === 408) {
    throw new ProviderError('Request timed out at provider', 'timeout', providerId, 408);
  }
  if (response.status >= 500) {
    throw new ProviderError('Provider server error', 'server', providerId, response.status);
  }
  if (!response.ok) {
    throw new ProviderError(`Unexpected HTTP ${response.status}`, 'invalid_response', providerId, response.status);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ProviderError('Invalid JSON response', 'invalid_response', providerId);
  }
}

export interface TextResponse {
  text: string;
  status: number;
  etag: string | null;
  lastModified: string | null;
}

/**
 * Like {@link fetchJson} but returns the raw body as text — used for RSS/Atom
 * feeds. A `304 Not Modified` is returned (not thrown) with an empty body so
 * callers can reuse their cached copy. Same status→ProviderError taxonomy for
 * every other failure.
 */
export async function fetchText(
  providerId: ProviderId,
  url: string,
  options: { headers?: Record<string, string>; timeoutMs?: number } = {},
): Promise<TextResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { headers: options.headers, signal: controller.signal });
  } catch (error) {
    clearTimeout(timeout);
    if ((error as Error).name === 'AbortError') {
      throw new ProviderError('Request timed out', 'timeout', providerId);
    }
    throw new ProviderError('Network request failed', 'network', providerId);
  }
  clearTimeout(timeout);

  const meta = {
    etag: response.headers.get('etag'),
    lastModified: response.headers.get('last-modified'),
  };

  if (response.status === 304) {
    return { text: '', status: 304, ...meta };
  }
  if (response.status === 401) throw new ProviderError('Unauthorized', 'unauthorized', providerId, 401);
  if (response.status === 403) throw new ProviderError('Forbidden by provider', 'forbidden', providerId, 403);
  if (response.status === 404) throw new ProviderError('Resource not found', 'not_found', providerId, 404);
  if (response.status === 429) throw new ProviderError('Rate limited by provider', 'rate_limited', providerId, 429);
  if (response.status >= 500) throw new ProviderError('Provider server error', 'server', providerId, response.status);
  if (!response.ok) {
    throw new ProviderError(`Unexpected HTTP ${response.status}`, 'invalid_response', providerId, response.status);
  }

  return { text: await response.text(), status: response.status, ...meta };
}

/**
 * Retries `fn` on transient failures (network / timeout / 5xx / rate-limit)
 * with a short escalating backoff. Non-transient `ProviderError`s (auth, 404,
 * bad response) are rethrown immediately.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; baseMs?: number } = {},
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 2);
  const baseMs = options.baseMs ?? 500;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const transient = !(error instanceof ProviderError)
        || ['network', 'timeout', 'server', 'rate_limited'].includes(error.kind);
      if (!transient || attempt === attempts - 1) throw error;
      await new Promise<void>(resolve => { setTimeout(() => resolve(), baseMs * (attempt + 1)); });
    }
  }
  throw lastError;
}

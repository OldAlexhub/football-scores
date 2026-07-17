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

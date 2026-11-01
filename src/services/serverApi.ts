import { API_BASE_URL } from '../config/serverConfig';
export interface ServerMeta { fetchedAt: string; isStale?: boolean; partial?: boolean; importPending?: boolean; nextOffset?: number | null; label?: string; reason?: string; coverage?: CoverageRow[] }
export interface CoverageRow { id?: string; competition_id: string; name?: string; season: string; source: string; status: string; fixture_count: number; confirmed_count: number; result_count: number; checked_at: string | null; last_success_at: string | null }
export interface ApiEnvelope<T> { data: T; meta: ServerMeta }
export class ServerError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function serverRequest<T>(path: string, body?: unknown, accessToken?: string): Promise<T> {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw new ServerError(response.status, typeof data.error === 'string' ? data.error : 'Service unavailable');
    return data as T;
  } finally { clearTimeout(timer); }
}

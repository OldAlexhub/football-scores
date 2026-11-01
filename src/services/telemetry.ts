import { NativeModules } from 'react-native';
import { APP_VERSION } from '../config/serverConfig';
import { runExecute, runQuery } from '../storage/db';
import { getPreferences } from '../storage/preferencesRepo';
import { preferencesStorage } from '../storage/mmkvStorage';
import { generateId } from '../utils/id';
import { serverRequest, ServerError } from './serverApi';

interface Identity { id: string; accessToken: string; recoveryCode: string }
type Properties = { entityId?: string; screen?: string; placement?: string; format?: 'banner' | 'native' | 'interstitial' | 'app_open'; currency?: string; valueMicros?: number; precision?: string; code?: string; appVersion?: string };
let identityPromise: Promise<Identity> | null = null;
let flushing: Promise<void> | null = null;
let deleting = false;
let pendingWrites: Promise<void> = Promise.resolve();
const runtime = NativeModules.FootballRuntime;
export const sharingAccepted = () => getPreferences().dataDisclosureVersion === 1;
export async function installationIdentity(): Promise<Identity> {
  if (!sharingAccepted() || preferencesStorage.getBoolean('data_deletion_pending')) throw new Error('Data sharing disclosure required');
  if (!identityPromise) identityPromise = (async () => {
    if (!runtime) throw new Error('Secure installation storage unavailable');
    const stored = await runtime.readIdentity();
    if (stored) return JSON.parse(stored) as Identity;
    const identity = await serverRequest<Identity>('/installations', { appVersion: APP_VERSION });
    await runtime.writeIdentity(JSON.stringify(identity));
    return identity;
  })().catch(error => { identityPromise = null; throw error; });
  return identityPromise;
}
export function track(name: string, properties: Properties = {}): void {
  if (!sharingAccepted() || deleting || preferencesStorage.getBoolean('data_deletion_pending')) return;
  // Development and test-ad traffic never contaminates the production analytics database.
  if (__DEV__) return;
  pendingWrites = pendingWrites.then(async () => {
    if (deleting || preferencesStorage.getBoolean('data_deletion_pending')) return;
    await runExecute('INSERT INTO telemetry_outbox(id,name,occurred_at,properties) VALUES(?,?,?,?)', [generateId(), name, new Date().toISOString(), JSON.stringify({ ...properties, appVersion: APP_VERSION })]);
    await runExecute("DELETE FROM telemetry_outbox WHERE occurred_at < ? OR id NOT IN (SELECT id FROM telemetry_outbox ORDER BY occurred_at DESC LIMIT 2000)", [new Date(Date.now() - 7 * 86400000).toISOString()]);
  }).catch(() => undefined);
}
export function trackAd(name: string, placement: string, format: Properties['format'], value?: { currency: string; value: number; precision: unknown }) {
  track(name, { placement, format, ...(value ? { currency: value.currency, valueMicros: Math.round(value.value * 1000000), precision: String(value.precision) } : {}) });
  if (name === 'ad_paid') setTimeout(() => { void flushTelemetry(); }, 100);
}
export async function flushTelemetry(): Promise<void> {
  if (__DEV__ || !sharingAccepted() || deleting || preferencesStorage.getBoolean('data_deletion_pending')) return;
  if (flushing) return flushing;
  flushing = (async () => {
    try {
      const identity = await installationIdentity();
      const rows = await runQuery<{ id: string; name: string; occurred_at: string; properties: string }>('SELECT * FROM telemetry_outbox ORDER BY occurred_at LIMIT 100');
      if (!rows.length) return;
      await serverRequest('/telemetry', { events: rows.map(r => ({ id: r.id, name: r.name, occurredAt: r.occurred_at, properties: JSON.parse(r.properties) })) }, identity.accessToken);
      for (const row of rows) await runExecute('DELETE FROM telemetry_outbox WHERE id=?', [row.id]);
    } catch (error) {
      if (error instanceof ServerError && error.status === 401) {
        // Revocation is not an instruction to silently register a new identity.
        preferencesStorage.set('data_deletion_pending', true);
        await runExecute('DELETE FROM telemetry_outbox');
      }
    } finally { flushing = null; }
  })(); return flushing;
}
export async function exportMyData(): Promise<unknown> {
  const identity = await installationIdentity(); await flushTelemetry();
  return serverRequest('/data/export', {}, identity.accessToken);
}
export async function deleteMyData(): Promise<void> {
  deleting = true;
  try {
    await flushing;
    await pendingWrites;
    const stored = await runtime.readIdentity();
    if (stored) {
      const identity = JSON.parse(stored) as Identity;
      await serverRequest('/data/delete', {}, identity.accessToken);
    }
    preferencesStorage.set('data_deletion_pending', true);
    await runExecute('DELETE FROM telemetry_outbox');
    await runtime.clearIdentity(); identityPromise = null;
    runtime.cancelSync();
  } finally { deleting = false; }
}
export async function beginNewInstallation(): Promise<void> {
  if (preferencesStorage.getBoolean('data_deletion_pending')) {
    await runtime.clearIdentity();
    await runExecute('DELETE FROM telemetry_outbox');
  }
  preferencesStorage.delete('data_deletion_pending'); identityPromise = null;
}

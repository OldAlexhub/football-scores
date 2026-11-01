import type { Match } from '../types/domain';
export interface ReminderIntent { match: Match; offsetMinutes: number; origin: 'manual' | 'favorite' }
export function planReminders(intents: ReminderIntent[], now: number, limit = 40): ReminderIntent[] {
  const unique = new Map<string, ReminderIntent>();
  for (const intent of intents) {
    const { match, offsetMinutes } = intent;
    if (match.status !== 'scheduled' || match.kickoffUnknown || !match.kickoffUtc) continue;
    const trigger = Date.parse(match.kickoffUtc) - offsetMinutes * 60000;
    if (!Number.isFinite(trigger) || trigger <= now || Date.parse(match.kickoffUtc) > now + 14*86400000) continue;
    if (!unique.has(match.id) || intent.origin === 'manual') unique.set(match.id, intent);
  }
  return [...unique.values()].sort((a,b)=>(Date.parse(a.match.kickoffUtc!) - a.offsetMinutes*60000) - (Date.parse(b.match.kickoffUtc!) - b.offsetMinutes*60000)).slice(0,limit);
}

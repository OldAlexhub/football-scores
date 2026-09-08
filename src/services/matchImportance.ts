import { resolveCatalogCompetition } from '../config/competitionCatalog';
import { BIG_CLUBS, canonicalTeam } from '../providers/nameMatch';
import type { Match } from '../types/domain';

export interface ImportanceContext {
  now?: Date;
  /** Canonical names (`canonicalTeam(...)`) of followed teams + followed players' clubs. */
  followedTeamNames?: Set<string>;
}

const KNOCKOUT_PATTERN = /final|semi|quarter|round of|knockout|play-?off/i;

/** Higher = a bigger deal. Used to rank "match of the day" and today's list. */
export function scoreMatchImportance(match: Match, ctx: ImportanceContext = {}): number {
  const now = ctx.now ?? new Date();
  const followed = ctx.followedTeamNames ?? new Set<string>();
  const catalog = resolveCatalogCompetition(match.catalogKey)
    ?? resolveCatalogCompetition(match.competitionId)
    ?? resolveCatalogCompetition(match.competitionName);

  let score = 0;

  if (catalog?.tier === 1) score += 40;
  else if (catalog?.category === 'club') score += 35;
  else if (catalog?.tier === 2) score += 30;
  else if (catalog?.category === 'domestic') score += 12;
  else score += 6;

  const roundText = `${match.round ?? ''} ${match.stage ?? ''}`;
  if (match.isKnockout || catalog?.knockout || KNOCKOUT_PATTERN.test(roundText)) score += 25;
  if (/\bfinal\b/i.test(roundText) && !/semi/i.test(roundText)) score += 15;

  if (match.kickoffUtc) {
    const delta = new Date(match.kickoffUtc).getTime() - now.getTime();
    const day = 86_400_000;
    if (Math.abs(delta) < day && new Date(match.kickoffUtc).toDateString() === now.toDateString()) score += 20;
    else if (delta > 0 && delta < 3 * day) score += 8;
    else if (delta < 0 && delta > -day) score += 6;
  }

  if (match.status === 'live' || match.status === 'half_time') score += 30;

  const home = canonicalTeam(match.homeTeamName);
  const away = canonicalTeam(match.awayTeamName);
  let followedBoost = 0;
  if (followed.has(home)) followedBoost += 25;
  if (followed.has(away)) followedBoost += 25;
  score += Math.min(followedBoost, 40);

  if (BIG_CLUBS.has(home) && BIG_CLUBS.has(away)) score += 12;

  return score;
}

/** The single most compelling fixture in the ~[-6h, +36h] window, or null. */
export function pickMatchOfTheDay(matches: Match[], ctx: ImportanceContext = {}): Match | null {
  const now = ctx.now ?? new Date();
  const lo = now.getTime() - 6 * 3_600_000;
  const hi = now.getTime() + 36 * 3_600_000;

  const candidates = matches.filter(match => {
    if (!match.kickoffUtc) return false;
    const kickoff = new Date(match.kickoffUtc).getTime();
    return kickoff >= lo && kickoff <= hi;
  });
  if (candidates.length === 0) return null;

  return candidates
    .map(match => ({ match, score: scoreMatchImportance(match, { ...ctx, now }) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.match.kickoffUtc ?? '').localeCompare(b.match.kickoffUtc ?? '');
    })[0].match;
}

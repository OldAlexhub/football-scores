/**
 * Cross-provider team / competition name reconciliation. Every keyless source
 * spells clubs differently ("FC Bayern München" vs "Bayern Munich" vs
 * "Bay Munich"), so the merge pipeline collapses names to a canonical form
 * before deciding whether two records describe the same fixture.
 *
 * Pure module — no React Native imports — so it stays unit-testable.
 */

/**
 * Whole-word tokens that are org-type noise, not identity. Deliberately
 * excludes semantic words that distinguish clubs sharing a city
 * ("Atletico"/"Real"/"Athletic"/"Sporting"/"Racing").
 */
const STOP_TOKENS = new Set([
  'fc', 'cf', 'afc', 'sc', 'ac', 'cd', 'ca', 'cp', 'sd', 'sv', 'if', 'fk', 'bk',
  'sk', 'ss', 'ssc', 'us', 'as', 'sl', 'rc', 'rcd', 'ud', 'ec', 'tsv', 'tsg',
  'vfl', 'vfb', 'bsc', 'fsv', 'club', 'clube', 'football', 'fussball', 'calcio',
]);

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Nickname / cross-language → canonical normalized form. Keys and values are
 * already run through `normalizeTeamName`, so lookups are cheap.
 */
export const TEAM_ALIASES: Record<string, string> = {
  // England
  'man utd': 'manchester united',
  'man united': 'manchester united',
  'man city': 'manchester city',
  spurs: 'tottenham hotspur',
  tottenham: 'tottenham hotspur',
  wolves: 'wolverhampton wanderers',
  wolverhampton: 'wolverhampton wanderers',
  'newcastle': 'newcastle united',
  'newcastle utd': 'newcastle united',
  'nottm forest': 'nottingham forest',
  "nott m forest": 'nottingham forest',
  'sheffield utd': 'sheffield united',
  'brighton hove albion': 'brighton',
  'brighton and hove albion': 'brighton',
  'west ham': 'west ham united',
  'leeds': 'leeds united',
  'leicester': 'leicester city',
  // Spain
  barca: 'barcelona',
  'fc barcelona': 'barcelona',
  'atletico de madrid': 'atletico madrid',
  'atl madrid': 'atletico madrid',
  'athletic bilbao': 'athletic club',
  'athletic': 'athletic club',
  'real betis balompie': 'real betis',
  betis: 'real betis',
  'real sociedad de futbol': 'real sociedad',
  'deportivo alaves': 'alaves',
  'rcd espanyol': 'espanyol',
  'rcd espanyol de barcelona': 'espanyol',
  'rc celta': 'celta vigo',
  'celta': 'celta vigo',
  'rayo': 'rayo vallecano',
  // Italy
  inter: 'internazionale',
  'inter milan': 'internazionale',
  'internazionale milano': 'internazionale',
  'ac milan': 'milan',
  'as roma': 'roma',
  'ssc napoli': 'napoli',
  juve: 'juventus',
  'juventus turin': 'juventus',
  // Germany
  bayern: 'bayern munchen',
  'bayern munich': 'bayern munchen',
  'fc bayern munchen': 'bayern munchen',
  'fc bayern': 'bayern munchen',
  dortmund: 'borussia dortmund',
  bvb: 'borussia dortmund',
  gladbach: 'borussia monchengladbach',
  'mgladbach': 'borussia monchengladbach',
  'monchengladbach': 'borussia monchengladbach',
  'bor monchengladbach': 'borussia monchengladbach',
  leverkusen: 'bayer leverkusen',
  'bayer 04 leverkusen': 'bayer leverkusen',
  'koln': 'fc koln',
  cologne: 'fc koln',
  'fc cologne': 'fc koln',
  'eintracht frankfurt': 'eintracht frankfurt',
  'sge': 'eintracht frankfurt',
  'rb leipzig': 'leipzig',
  'rasenballsport leipzig': 'leipzig',
  'union berlin': 'union berlin',
  'fc union berlin': 'union berlin',
  'werder': 'werder bremen',
  'vfb stuttgart': 'stuttgart',
  'vfl wolfsburg': 'wolfsburg',
  'tsg hoffenheim': 'hoffenheim',
  '1899 hoffenheim': 'hoffenheim',
  'fsv mainz 05': 'mainz',
  'mainz 05': 'mainz',
  schalke: 'schalke 04',
  // France
  psg: 'paris saint germain',
  'paris sg': 'paris saint germain',
  'paris saint germain fc': 'paris saint germain',
  'ol': 'lyon',
  'olympique lyonnais': 'lyon',
  'om': 'marseille',
  'olympique de marseille': 'marseille',
  'olympique marseille': 'marseille',
  'losc': 'lille',
  'losc lille': 'lille',
  'stade rennais': 'rennes',
  'as monaco': 'monaco',
  // Portugal / Netherlands
  benfica: 'benfica',
  'sl benfica': 'benfica',
  'sporting cp': 'sporting lisbon',
  'sporting clube de portugal': 'sporting lisbon',
  'fc porto': 'porto',
  ajax: 'ajax amsterdam',
  'afc ajax': 'ajax amsterdam',
  psv: 'psv eindhoven',
  feyenoord: 'feyenoord rotterdam',
};

/** Reasonable "these are marquee clubs" set, keyed by canonical form. */
export const BIG_CLUBS = new Set<string>([
  'manchester united', 'manchester city', 'liverpool', 'chelsea', 'arsenal',
  'tottenham hotspur', 'barcelona', 'real madrid', 'atletico madrid',
  'internazionale', 'milan', 'juventus', 'napoli', 'roma', 'bayern munchen',
  'borussia dortmund', 'bayer leverkusen', 'paris saint germain', 'marseille',
  'benfica', 'porto', 'sporting lisbon', 'ajax amsterdam', 'psv eindhoven',
]);

export function normalizeTeamName(raw: string | null | undefined): string {
  if (!raw) return '';
  const cleaned = stripDiacritics(String(raw))
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!cleaned) return '';
  const tokens = cleaned.split(' ');
  const kept = tokens.filter(token => token && !/^\d+$/.test(token) && !STOP_TOKENS.has(token));
  const result = (kept.length > 0 ? kept : tokens).join(' ').trim();
  return result;
}

export function canonicalTeam(raw: string | null | undefined): string {
  const normalized = normalizeTeamName(raw);
  return TEAM_ALIASES[normalized] ?? normalized;
}

/** Order-independent fixture identity (home/away swaps between providers still group). */
export function matchIdentityKey(homeRaw: string, awayRaw: string): string {
  return [canonicalTeam(homeRaw), canonicalTeam(awayRaw)].sort().join('|');
}

interface FixtureLike {
  homeTeamName: string;
  awayTeamName: string;
  kickoffUtc: string | null;
  kickoffUnknown?: boolean;
}

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

/** True when two records plausibly describe the same match. */
export function sameFixture(a: FixtureLike, b: FixtureLike): boolean {
  if (matchIdentityKey(a.homeTeamName, a.awayTeamName) !== matchIdentityKey(b.homeTeamName, b.awayTeamName)) {
    return false;
  }
  const at = a.kickoffUtc ? new Date(a.kickoffUtc).getTime() : NaN;
  const bt = b.kickoffUtc ? new Date(b.kickoffUtc).getTime() : NaN;
  const aConfirmed = !Number.isNaN(at) && a.kickoffUnknown !== true;
  const bConfirmed = !Number.isNaN(bt) && b.kickoffUnknown !== true;
  if (!aConfirmed || !bConfirmed) {
    // At least one side has no confirmed kickoff — fall back to same UTC day.
    const ad = (a.kickoffUtc ?? '').slice(0, 10);
    const bd = (b.kickoffUtc ?? '').slice(0, 10);
    return !!ad && ad === bd;
  }
  return Math.abs(at - bt) <= SIX_HOURS_MS;
}

const COMPETITION_PREFIX = /^(uefa|afc|caf|concacaf|conmebol|fifa)\s+/;

export function normalizeCompetitionName(raw: string | null | undefined): string {
  if (!raw) return '';
  return stripDiacritics(String(raw))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(COMPETITION_PREFIX, '')
    .replace(/\s+/g, ' ')
    .trim();
}

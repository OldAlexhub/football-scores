import { normalizeCompetitionName } from '../providers/nameMatch';

export type CompetitionCategory = 'domestic' | 'club' | 'international';

export interface CompetitionCatalogItem {
  key: string;
  label: string;
  /** Provider-facing name variants, used by the normalised-name matcher. */
  names: readonly string[];
  /** Extra nicknames / abbreviations for the matcher only. */
  aliases?: readonly string[];
  sportsDbLeagueId: string;
  canonicalId: string;
  canonicalName: string;
  category: CompetitionCategory;
  /** 1 = marquee international, 2 = top-tier club, 3 = everything else. */
  tier: 1 | 2 | 3;
  /** Pure single-elimination competition (used by match-importance scoring). */
  knockout?: boolean;
  /** ESPN soccer league slug, e.g. `eng.1`. */
  espnCode?: string;
  /** OpenFootball dataset code (bare, e.g. `en.1` / `uefa.cl` / `euro`). */
  openFootballCode?: string;
  /** OpenLigaDB league shortcut, e.g. `bl1`. */
  openLigaShortcut?: string;
  /** API-Football numeric league id (only used if a key is ever added). */
  apiFootballId?: number;
}

/**
 * Curated multi-provider coverage. Each row carries every provider's own id
 * for the same competition so a picker selection resolves in ESPN,
 * OpenFootball, OpenLigaDB and TheSportsDB — not just one of them.
 */
export const COMPETITION_CATALOG: readonly CompetitionCatalogItem[] = [
  { key: 'premier-league', label: 'Premier League', names: ['Premier League', 'English Premier League'], aliases: ['epl'], sportsDbLeagueId: '4328', canonicalId: 'openfootball:en.1', canonicalName: 'Premier League', category: 'domestic', tier: 2, espnCode: 'eng.1', openFootballCode: 'en.1', apiFootballId: 39 },
  { key: 'championship', label: 'EFL Championship', names: ['Championship', 'English League Championship'], aliases: ['efl championship'], sportsDbLeagueId: '4329', canonicalId: 'openfootball:en.2', canonicalName: 'Championship', category: 'domestic', tier: 3, espnCode: 'eng.2', openFootballCode: 'en.2', apiFootballId: 40 },
  { key: 'la-liga', label: 'La Liga', names: ['La Liga', 'Spanish La Liga', 'Primera Division', 'LaLiga EA Sports'], aliases: ['laliga'], sportsDbLeagueId: '4335', canonicalId: 'openfootball:es.1', canonicalName: 'La Liga', category: 'domestic', tier: 2, espnCode: 'esp.1', openFootballCode: 'es.1', apiFootballId: 140 },
  { key: 'bundesliga', label: 'Bundesliga', names: ['Bundesliga', 'German Bundesliga'], aliases: ['1 bundesliga'], sportsDbLeagueId: '4331', canonicalId: 'openfootball:de.1', canonicalName: 'Bundesliga', category: 'domestic', tier: 2, espnCode: 'ger.1', openFootballCode: 'de.1', openLigaShortcut: 'bl1', apiFootballId: 78 },
  { key: '2-bundesliga', label: '2. Bundesliga', names: ['2. Bundesliga', '2 Bundesliga', 'German 2. Bundesliga'], sportsDbLeagueId: '4330', canonicalId: 'openfootball:de.2', canonicalName: '2. Bundesliga', category: 'domestic', tier: 3, espnCode: 'ger.2', openFootballCode: 'de.2', openLigaShortcut: 'bl2', apiFootballId: 79 },
  { key: 'serie-a', label: 'Serie A', names: ['Serie A', 'Italian Serie A'], aliases: ['serie a tim'], sportsDbLeagueId: '4332', canonicalId: 'openfootball:it.1', canonicalName: 'Serie A', category: 'domestic', tier: 2, espnCode: 'ita.1', openFootballCode: 'it.1', apiFootballId: 135 },
  { key: 'ligue-1', label: 'Ligue 1', names: ['Ligue 1', 'French Ligue 1'], aliases: ['ligue 1 uber eats'], sportsDbLeagueId: '4334', canonicalId: 'openfootball:fr.1', canonicalName: 'Ligue 1', category: 'domestic', tier: 2, espnCode: 'fra.1', openFootballCode: 'fr.1', apiFootballId: 61 },
  { key: 'mls', label: 'MLS', names: ['MLS', 'American Major League Soccer', 'Major League Soccer'], sportsDbLeagueId: '4346', canonicalId: 'openfootball:mls', canonicalName: 'MLS', category: 'domestic', tier: 3, espnCode: 'usa.1', openFootballCode: 'mls', apiFootballId: 253 },
  { key: 'usl-championship', label: 'USL Championship', names: ['American USL Championship', 'USL Championship'], sportsDbLeagueId: '4684', canonicalId: 'thesportsdb:4684', canonicalName: 'American USL Championship', category: 'domestic', tier: 3, espnCode: 'usa.usl.1' },
  { key: 'usl-league-one', label: 'USL League One', names: ['American USL League One', 'USL League One'], sportsDbLeagueId: '5076', canonicalId: 'thesportsdb:5076', canonicalName: 'American USL League One', category: 'domestic', tier: 3, espnCode: 'usa.usl.l1' },
  { key: 'liga-mx', label: 'Liga MX', names: ['Liga MX', 'Mexican Primera League'], sportsDbLeagueId: '4350', canonicalId: 'openfootball:mx.1', canonicalName: 'Liga MX', category: 'domestic', tier: 3, espnCode: 'mex.1', openFootballCode: 'mx.1', apiFootballId: 262 },
  { key: 'saudi-pro-league', label: 'Saudi Pro League', names: ['Saudi Pro League', 'Saudi-Arabian Pro League', 'Saudi Professional League', 'Roshn Saudi League'], sportsDbLeagueId: '4668', canonicalId: 'thesportsdb:4668', canonicalName: 'Saudi Pro League', category: 'domestic', tier: 3, espnCode: 'ksa.1', apiFootballId: 307 },
  { key: 'egyptian-premier-league', label: 'Egyptian Premier League', names: ['Egyptian Premier League', 'Egyptian League'], sportsDbLeagueId: '4829', canonicalId: 'openfootball:eg.1', canonicalName: 'Egyptian Premier League', category: 'domestic', tier: 3, espnCode: 'egy.1', openFootballCode: 'eg.1', apiFootballId: 233 },
  { key: 'brasileirao', label: 'Brasileirão', names: ['Brasileirão', 'Brazilian Serie A', 'Campeonato Brasileiro Serie A'], sportsDbLeagueId: '4351', canonicalId: 'openfootball:br.1', canonicalName: 'Brasileirão', category: 'domestic', tier: 3, espnCode: 'bra.1', openFootballCode: 'br.1', apiFootballId: 71 },
  { key: 'argentina', label: 'Argentina Primera', names: ['Liga Profesional Argentina', 'Argentinian Primera Division', 'Primera Division'], sportsDbLeagueId: '4406', canonicalId: 'openfootball:ar.1', canonicalName: 'Liga Profesional Argentina', category: 'domestic', tier: 3, espnCode: 'arg.1', openFootballCode: 'ar.1', apiFootballId: 128 },
  { key: 'eredivisie', label: 'Eredivisie', names: ['Eredivisie', 'Dutch Eredivisie'], sportsDbLeagueId: '4337', canonicalId: 'openfootball:nl.1', canonicalName: 'Eredivisie', category: 'domestic', tier: 3, espnCode: 'ned.1', openFootballCode: 'nl.1', apiFootballId: 88 },
  { key: 'primeira-liga', label: 'Primeira Liga', names: ['Primeira Liga', 'Portuguese Primeira Liga', 'Liga Portugal'], sportsDbLeagueId: '4344', canonicalId: 'openfootball:pt.1', canonicalName: 'Primeira Liga', category: 'domestic', tier: 3, espnCode: 'por.1', openFootballCode: 'pt.1', apiFootballId: 94 },
  { key: 'dfb-pokal', label: 'DFB-Pokal', names: ['DFB Pokal', 'DFB-Pokal', 'German Cup'], sportsDbLeagueId: '4485', canonicalId: 'thesportsdb:4485', canonicalName: 'DFB-Pokal', category: 'domestic', tier: 3, knockout: true, espnCode: 'ger.dfb_pokal', openLigaShortcut: 'dfb', apiFootballId: 81 },

  { key: 'champions-league', label: 'UEFA Champions League', names: ['UEFA Champions League', 'Champions League'], aliases: ['ucl'], sportsDbLeagueId: '4480', canonicalId: 'openfootball:uefa.cl', canonicalName: 'UEFA Champions League', category: 'club', tier: 1, espnCode: 'uefa.champions', openFootballCode: 'uefa.cl', apiFootballId: 2 },
  { key: 'europa-league', label: 'UEFA Europa League', names: ['UEFA Europa League', 'Europa League'], aliases: ['uel'], sportsDbLeagueId: '4481', canonicalId: 'thesportsdb:4481', canonicalName: 'UEFA Europa League', category: 'club', tier: 2, espnCode: 'uefa.europa', apiFootballId: 3 },
  { key: 'conference-league', label: 'UEFA Conference League', names: ['UEFA Conference League', 'Europa Conference League', 'UEFA Europa Conference League'], sportsDbLeagueId: '5071', canonicalId: 'thesportsdb:5071', canonicalName: 'UEFA Conference League', category: 'club', tier: 3, espnCode: 'uefa.europa.conf', apiFootballId: 848 },
  { key: 'caf-champions-league', label: 'CAF Champions League', names: ['CAF Champions League'], sportsDbLeagueId: '4720', canonicalId: 'thesportsdb:4720', canonicalName: 'CAF Champions League', category: 'club', tier: 3, espnCode: 'caf.champions', apiFootballId: 12 },
  { key: 'afc-champions-league', label: 'AFC Champions League Elite', names: ['AFC Champions League Elite', 'AFC Champions League'], sportsDbLeagueId: '4719', canonicalId: 'thesportsdb:4719', canonicalName: 'AFC Champions League Elite', category: 'club', tier: 3, espnCode: 'afc.champions' },
  { key: 'copa-libertadores', label: 'Copa Libertadores', names: ['Copa Libertadores', 'CONMEBOL Libertadores'], sportsDbLeagueId: '4501', canonicalId: 'thesportsdb:4501', canonicalName: 'Copa Libertadores', category: 'club', tier: 3, espnCode: 'conmebol.libertadores', apiFootballId: 13 },
  { key: 'club-world-cup', label: 'FIFA Club World Cup', names: ['FIFA Club World Cup'], sportsDbLeagueId: '4503', canonicalId: 'openfootball:club-world-cup', canonicalName: 'FIFA Club World Cup', category: 'club', tier: 2, espnCode: 'fifa.cwc', openFootballCode: 'club-world-cup', apiFootballId: 15 },

  { key: 'world-cup', label: 'FIFA World Cup', names: ['FIFA World Cup', 'World Cup'], sportsDbLeagueId: '4429', canonicalId: 'openfootball:world-cup', canonicalName: 'FIFA World Cup', category: 'international', tier: 1, knockout: true, espnCode: 'fifa.world', openFootballCode: 'world-cup', apiFootballId: 1 },
  { key: 'afcon', label: 'Africa Cup of Nations (AFCON)', names: ['African Cup of Nations', 'Africa Cup of Nations', 'AFCON'], sportsDbLeagueId: '4496', canonicalId: 'thesportsdb:4496', canonicalName: 'Africa Cup of Nations', category: 'international', tier: 1, knockout: true, espnCode: 'caf.nations', apiFootballId: 6 },
  { key: 'asian-cup', label: 'AFC Asian Cup', names: ['AFC Asian Cup', 'Asian Cup'], sportsDbLeagueId: '4866', canonicalId: 'thesportsdb:4866', canonicalName: 'AFC Asian Cup', category: 'international', tier: 1, knockout: true, espnCode: 'afc.asian.cup', apiFootballId: 7 },
  { key: 'euros', label: 'UEFA European Championship', names: ['UEFA European Championships', 'UEFA European Championship', 'European Championship'], aliases: ['euro', 'euros'], sportsDbLeagueId: '4502', canonicalId: 'openfootball:euro', canonicalName: 'UEFA European Championship', category: 'international', tier: 1, knockout: true, espnCode: 'uefa.euro', openFootballCode: 'euro', apiFootballId: 4 },
  { key: 'copa-america', label: 'Copa América', names: ['Copa America', 'Copa América', 'CONMEBOL Copa America'], sportsDbLeagueId: '4499', canonicalId: 'thesportsdb:4499', canonicalName: 'Copa America', category: 'international', tier: 1, knockout: true, espnCode: 'conmebol.america', apiFootballId: 9 },
  { key: 'gold-cup', label: 'CONCACAF Gold Cup', names: ['CONCACAF Gold Cup', 'Gold Cup'], sportsDbLeagueId: '4873', canonicalId: 'thesportsdb:4873', canonicalName: 'CONCACAF Gold Cup', category: 'international', tier: 2, knockout: true, espnCode: 'concacaf.gold', apiFootballId: 22 },
];

export const COMPETITION_BY_SPORTS_DB_ID = new Map(
  COMPETITION_CATALOG.map(competition => [competition.sportsDbLeagueId, competition]),
);

export const COMPETITION_BY_KEY = new Map(
  COMPETITION_CATALOG.map(competition => [competition.key, competition]),
);

export const COMPETITION_BY_ESPN_CODE = new Map(
  COMPETITION_CATALOG.filter(c => c.espnCode).map(c => [c.espnCode as string, c]),
);

const COMPETITION_BY_NORMALIZED_NAME = new Map<string, CompetitionCatalogItem>();
for (const competition of COMPETITION_CATALOG) {
  for (const name of [competition.canonicalName, competition.label, ...competition.names, ...(competition.aliases ?? [])]) {
    const normalized = normalizeCompetitionName(name);
    if (normalized && !COMPETITION_BY_NORMALIZED_NAME.has(normalized)) {
      COMPETITION_BY_NORMALIZED_NAME.set(normalized, competition);
    }
  }
}

/**
 * Resolve any provider's competition identifier or name to a catalog row.
 * Accepts a domain `competitionId` (`openfootball:en.1`), a bare provider code
 * (`en.1`, `eng.1`, `4328`), or a free-text competition name.
 */
export function resolveCatalogCompetition(input: string | null | undefined): CompetitionCatalogItem | null {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  const direct = COMPETITION_CATALOG.find(c => c.canonicalId === raw);
  if (direct) return direct;

  const bare = raw.includes(':') ? raw.slice(raw.indexOf(':') + 1) : raw;
  return (
    COMPETITION_BY_SPORTS_DB_ID.get(bare) ??
    COMPETITION_BY_ESPN_CODE.get(bare) ??
    COMPETITION_CATALOG.find(c => c.openFootballCode === bare) ??
    COMPETITION_CATALOG.find(c => c.openLigaShortcut === bare) ??
    COMPETITION_CATALOG.find(c => String(c.apiFootballId) === bare) ??
    COMPETITION_BY_NORMALIZED_NAME.get(normalizeCompetitionName(raw)) ??
    null
  );
}

/**
 * Fetched for the "All competitions" view. Kept modest so TheSportsDB's demo
 * key stays under its per-minute ceiling; ESPN / OpenFootball / OpenLigaDB
 * carry the rest of the load in parallel.
 */
export const DEFAULT_COMPETITION_KEYS = new Set([
  'world-cup',
  'afcon',
  'asian-cup',
  'euros',
  'copa-america',
  'champions-league',
  'europa-league',
  'caf-champions-league',
  'premier-league',
  'championship',
  'la-liga',
  'bundesliga',
  'serie-a',
  'ligue-1',
  'eredivisie',
  'primeira-liga',
  'mls',
  'liga-mx',
  'egyptian-premier-league',
  'saudi-pro-league',
]);

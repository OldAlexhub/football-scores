export type CompetitionCategory = 'domestic' | 'club' | 'international';

export interface CompetitionCatalogItem {
  key: string;
  label: string;
  names: readonly string[];
  sportsDbLeagueId: string;
  canonicalId: string;
  canonicalName: string;
  category: CompetitionCategory;
}

/**
 * Curated, keyless coverage kept below TheSportsDB's 30 requests/minute
 * free-tier ceiling when the All competitions view refreshes one match day.
 */
export const COMPETITION_CATALOG: readonly CompetitionCatalogItem[] = [
  { key: 'premier-league', label: 'Premier League', names: ['Premier League', 'English Premier League'], sportsDbLeagueId: '4328', canonicalId: 'openfootball:en.1', canonicalName: 'Premier League', category: 'domestic' },
  { key: 'championship', label: 'EFL Championship', names: ['Championship', 'English League Championship'], sportsDbLeagueId: '4329', canonicalId: 'openfootball:en.2', canonicalName: 'Championship', category: 'domestic' },
  { key: 'la-liga', label: 'La Liga', names: ['La Liga', 'Spanish La Liga'], sportsDbLeagueId: '4335', canonicalId: 'openfootball:es.1', canonicalName: 'La Liga', category: 'domestic' },
  { key: 'bundesliga', label: 'Bundesliga', names: ['Bundesliga', 'German Bundesliga'], sportsDbLeagueId: '4331', canonicalId: 'openfootball:de.1', canonicalName: 'Bundesliga', category: 'domestic' },
  { key: 'serie-a', label: 'Serie A', names: ['Serie A', 'Italian Serie A'], sportsDbLeagueId: '4332', canonicalId: 'openfootball:it.1', canonicalName: 'Serie A', category: 'domestic' },
  { key: 'ligue-1', label: 'Ligue 1', names: ['Ligue 1', 'French Ligue 1'], sportsDbLeagueId: '4334', canonicalId: 'openfootball:fr.1', canonicalName: 'Ligue 1', category: 'domestic' },
  { key: 'mls', label: 'MLS', names: ['MLS', 'American Major League Soccer'], sportsDbLeagueId: '4346', canonicalId: 'openfootball:mls', canonicalName: 'MLS', category: 'domestic' },
  { key: 'usl-championship', label: 'USL Championship', names: ['American USL Championship', 'USL Championship'], sportsDbLeagueId: '4684', canonicalId: 'thesportsdb:4684', canonicalName: 'American USL Championship', category: 'domestic' },
  { key: 'usl-league-one', label: 'USL League One', names: ['American USL League One', 'USL League One'], sportsDbLeagueId: '5076', canonicalId: 'thesportsdb:5076', canonicalName: 'American USL League One', category: 'domestic' },
  { key: 'liga-mx', label: 'Liga MX', names: ['Liga MX', 'Mexican Primera League'], sportsDbLeagueId: '4350', canonicalId: 'openfootball:mx.1', canonicalName: 'Liga MX', category: 'domestic' },
  { key: 'saudi-pro-league', label: 'Saudi Pro League', names: ['Saudi Pro League', 'Saudi-Arabian Pro League'], sportsDbLeagueId: '4668', canonicalId: 'thesportsdb:4668', canonicalName: 'Saudi Pro League', category: 'domestic' },
  { key: 'egyptian-premier-league', label: 'Egyptian Premier League', names: ['Egyptian Premier League', 'Egyptian League'], sportsDbLeagueId: '4829', canonicalId: 'openfootball:eg.1', canonicalName: 'Egyptian Premier League', category: 'domestic' },
  { key: 'brasileirao', label: 'Brasileirão', names: ['Brasileirão', 'Brazilian Serie A'], sportsDbLeagueId: '4351', canonicalId: 'openfootball:br.1', canonicalName: 'Brasileirão', category: 'domestic' },
  { key: 'argentina', label: 'Argentina Primera', names: ['Liga Profesional Argentina', 'Argentinian Primera Division'], sportsDbLeagueId: '4406', canonicalId: 'openfootball:ar.1', canonicalName: 'Liga Profesional Argentina', category: 'domestic' },
  { key: 'eredivisie', label: 'Eredivisie', names: ['Eredivisie', 'Dutch Eredivisie'], sportsDbLeagueId: '4337', canonicalId: 'openfootball:nl.1', canonicalName: 'Eredivisie', category: 'domestic' },
  { key: 'primeira-liga', label: 'Primeira Liga', names: ['Primeira Liga', 'Portuguese Primeira Liga'], sportsDbLeagueId: '4344', canonicalId: 'openfootball:pt.1', canonicalName: 'Primeira Liga', category: 'domestic' },

  { key: 'champions-league', label: 'UEFA Champions League', names: ['UEFA Champions League', 'Champions League'], sportsDbLeagueId: '4480', canonicalId: 'openfootball:uefa.cl', canonicalName: 'UEFA Champions League', category: 'club' },
  { key: 'europa-league', label: 'UEFA Europa League', names: ['UEFA Europa League', 'Europa League'], sportsDbLeagueId: '4481', canonicalId: 'thesportsdb:4481', canonicalName: 'UEFA Europa League', category: 'club' },
  { key: 'conference-league', label: 'UEFA Conference League', names: ['UEFA Conference League', 'Europa Conference League'], sportsDbLeagueId: '5071', canonicalId: 'thesportsdb:5071', canonicalName: 'UEFA Conference League', category: 'club' },
  { key: 'caf-champions-league', label: 'CAF Champions League', names: ['CAF Champions League'], sportsDbLeagueId: '4720', canonicalId: 'thesportsdb:4720', canonicalName: 'CAF Champions League', category: 'club' },
  { key: 'afc-champions-league', label: 'AFC Champions League Elite', names: ['AFC Champions League Elite', 'AFC Champions League'], sportsDbLeagueId: '4719', canonicalId: 'thesportsdb:4719', canonicalName: 'AFC Champions League Elite', category: 'club' },
  { key: 'copa-libertadores', label: 'Copa Libertadores', names: ['Copa Libertadores'], sportsDbLeagueId: '4501', canonicalId: 'thesportsdb:4501', canonicalName: 'Copa Libertadores', category: 'club' },
  { key: 'club-world-cup', label: 'FIFA Club World Cup', names: ['FIFA Club World Cup'], sportsDbLeagueId: '4503', canonicalId: 'openfootball:club-world-cup', canonicalName: 'FIFA Club World Cup', category: 'club' },

  { key: 'world-cup', label: 'FIFA World Cup', names: ['FIFA World Cup', 'World Cup'], sportsDbLeagueId: '4429', canonicalId: 'openfootball:world-cup', canonicalName: 'FIFA World Cup', category: 'international' },
  { key: 'afcon', label: 'Africa Cup of Nations (AFCON)', names: ['African Cup of Nations', 'Africa Cup of Nations', 'AFCON'], sportsDbLeagueId: '4496', canonicalId: 'thesportsdb:4496', canonicalName: 'Africa Cup of Nations', category: 'international' },
  { key: 'asian-cup', label: 'AFC Asian Cup', names: ['AFC Asian Cup', 'Asian Cup'], sportsDbLeagueId: '4866', canonicalId: 'thesportsdb:4866', canonicalName: 'AFC Asian Cup', category: 'international' },
  { key: 'euros', label: 'UEFA European Championship', names: ['UEFA European Championships', 'UEFA European Championship', 'European Championship'], sportsDbLeagueId: '4502', canonicalId: 'openfootball:euro', canonicalName: 'UEFA European Championship', category: 'international' },
  { key: 'copa-america', label: 'Copa América', names: ['Copa America', 'Copa América'], sportsDbLeagueId: '4499', canonicalId: 'thesportsdb:4499', canonicalName: 'Copa America', category: 'international' },
  { key: 'gold-cup', label: 'CONCACAF Gold Cup', names: ['CONCACAF Gold Cup', 'Gold Cup'], sportsDbLeagueId: '4873', canonicalId: 'thesportsdb:4873', canonicalName: 'CONCACAF Gold Cup', category: 'international' },
];

export const COMPETITION_BY_SPORTS_DB_ID = new Map(
  COMPETITION_CATALOG.map(competition => [competition.sportsDbLeagueId, competition]),
);

export const DEFAULT_COMPETITION_KEYS = new Set([
  'world-cup',
  'afcon',
  'asian-cup',
  'euros',
  'copa-america',
  'champions-league',
  'caf-champions-league',
  'premier-league',
  'la-liga',
  'serie-a',
  'mls',
  'egyptian-premier-league',
  'saudi-pro-league',
]);

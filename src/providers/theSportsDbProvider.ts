import type {
  Competition,
  Match,
  PlayerCareerEntry,
  PlayerHonour,
  PlayerProfile,
  PlayerSearchResult,
  StandingRow,
  Team,
} from '../types/domain';
import { COMPETITION_BY_SPORTS_DB_ID, COMPETITION_CATALOG } from '../config/competitionCatalog';
import { THE_SPORTS_DB_CAPABILITIES } from './capabilities';
import { MAX_RANGE_DAYS } from './cacheKeys';
import { mapWithConcurrency } from './concurrency';
import { fetchJson } from './httpClient';
import { recordRequest } from './rateBudget';
import type { FootballDataProvider, FormResult, HeadToHeadResult, MatchesQuery } from './types';

const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/123';

const FEATURED_COMPETITION_PRIORITY = new Map(
  COMPETITION_CATALOG.map((competition, index) => [
    competition.canonicalId,
    (competition.category === 'international' ? 0 : competition.category === 'club' ? 100 : 200) + index,
  ]),
);

function scoreValue(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseHeightCm(value: unknown): number | null {
  const text = String(value ?? '');
  const metres = text.match(/([\d.]+)\s*m/i);
  if (metres) return Math.round(parseFloat(metres[1]) * 100);
  const feet = text.match(/(\d+)\s*ft\s*(\d+)?/i);
  if (feet) return Math.round((Number(feet[1]) * 12 + Number(feet[2] ?? 0)) * 2.54);
  return null;
}

function parseWeightKg(value: unknown): number | null {
  const text = String(value ?? '');
  const kg = text.match(/([\d.]+)\s*kg/i);
  if (kg) return Math.round(parseFloat(kg[1]));
  const lbs = text.match(/([\d.]+)\s*lb/i);
  if (lbs) return Math.round(parseFloat(lbs[1]) * 0.453592);
  return null;
}

function statusFor(rawStatus: unknown): Match['status'] {
  const status = String(rawStatus ?? '').toUpperCase();
  if (['1H', '2H', 'ET', 'P', 'LIVE', 'IN PLAY'].includes(status)) return 'live';
  if (['HT', 'HALF TIME'].includes(status)) return 'half_time';
  if (['FT', 'AET', 'PEN', 'MATCH FINISHED'].includes(status)) return 'finished';
  if (['PST', 'POSTPONED'].includes(status)) return 'postponed';
  if (['CANC', 'CANCELLED'].includes(status)) return 'cancelled';
  if (['SUSP', 'SUSPENDED'].includes(status)) return 'suspended';
  if (['ABD', 'ABANDONED'].includes(status)) return 'abandoned';
  return 'scheduled';
}

function kickoffFor(raw: any): string | null {
  const timestamp = String(raw.strTimestamp ?? '').trim();
  if (timestamp) {
    const parsed = new Date(/[z+-]\d{0,2}:?\d{0,2}$/i.test(timestamp) ? timestamp : `${timestamp}Z`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  if (!raw.dateEvent) return null;
  const parsed = new Date(`${raw.dateEvent}T${raw.strTime || '12:00:00'}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function mapMatch(raw: any): Match {
  const homeScore = scoreValue(raw.intHomeScore);
  const awayScore = scoreValue(raw.intAwayScore);
  const status = statusFor(raw.strStatus);
  const hasScore = homeScore != null || awayScore != null;
  const score = hasScore ? { home: homeScore, away: awayScore } : null;
  const elapsed = scoreValue(String(raw.strProgress ?? '').replace(/[^0-9]/g, ''));
  const homeId = String(raw.idHomeTeam ?? raw.strHomeTeam ?? 'home');
  const awayId = String(raw.idAwayTeam ?? raw.strAwayTeam ?? 'away');
  const homeName = String(raw.strHomeTeam ?? 'Home team');
  const awayName = String(raw.strAwayTeam ?? 'Away team');
  const featuredLeague = COMPETITION_BY_SPORTS_DB_ID.get(String(raw.idLeague ?? ''));
  return {
    id: `thesportsdb:${raw.idEvent}`,
    providerId: 'thesportsdb',
    providerMatchId: String(raw.idEvent),
    competitionId: featuredLeague?.canonicalId ?? `thesportsdb:${raw.idLeague ?? raw.strLeague}`,
    competitionName: featuredLeague?.canonicalName ?? String(raw.strLeague ?? 'Football'),
    competitionEmblemUrl: raw.strLeagueBadge ?? null,
    country: raw.strCountry ?? null,
    season: raw.strSeason ?? null,
    stage: raw.strGroup ?? null,
    round: featuredLeague?.category === 'domestic' && raw.intRound != null ? String(raw.intRound) : null,
    matchweek: featuredLeague?.category === 'domestic' ? scoreValue(raw.intRound) : null,
    homeTeamId: `thesportsdb:${homeId}`,
    homeTeamName: homeName,
    homeTeamInitials: homeName.slice(0, 3).toUpperCase(),
    homeTeamCrestUrl: raw.strHomeTeamBadge ?? null,
    awayTeamId: `thesportsdb:${awayId}`,
    awayTeamName: awayName,
    awayTeamInitials: awayName.slice(0, 3).toUpperCase(),
    awayTeamCrestUrl: raw.strAwayTeamBadge ?? null,
    kickoffUtc: kickoffFor(raw),
    kickoffUnknown: !raw.strTimestamp && !raw.strTime,
    status,
    statusDetail: raw.strStatus ?? null,
    elapsedMinutes: elapsed,
    injuryTimeMinutes: null,
    halfTimeScore: raw.intHomeScoreHT != null || raw.intAwayScoreHT != null
      ? { home: scoreValue(raw.intHomeScoreHT), away: scoreValue(raw.intAwayScoreHT) }
      : null,
    fullTimeScore: status === 'finished' ? score : null,
    extraTimeScore: null,
    penaltyScore: null,
    currentScore: score,
    winner: homeScore != null && awayScore != null
      ? homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : 'draw'
      : null,
    venue: raw.strVenue ?? null,
    referee: raw.strReferee ?? null,
    attendance: scoreValue(raw.intSpectators),
    lastProviderUpdateUtc: new Date().toISOString(),
    isKnockout: false,
    extraTimePossible: false,
    attribution: 'TheSportsDB',
  };
}

class TheSportsDbProvider implements FootballDataProvider {
  readonly id = 'thesportsdb' as const;
  readonly displayName = 'TheSportsDB';
  readonly capabilities = THE_SPORTS_DB_CAPABILITIES;

  isConfigured(): boolean { return true; }
  async getCompetitions(): Promise<Competition[]> { return []; }

  async getMatches(query: MatchesQuery): Promise<Match[]> {
    const hasCompetitionFilter = !!query.competitionProviderIds?.length;
    const requestedCompetitions = hasCompetitionFilter
      ? COMPETITION_CATALOG.filter(competition => !!competition.sportsDbLeagueId
        && query.competitionProviderIds?.includes(competition.canonicalId))
      : [];
    if (hasCompetitionFilter && requestedCompetitions.length === 0) return [];
    const dates: string[] = [];
    let cursor = new Date(query.dateFromUtc.slice(0, 10));
    const end = new Date(query.dateToUtc.slice(0, 10));
    while (cursor <= end && dates.length < MAX_RANGE_DAYS) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor = new Date(cursor.getTime() + 86_400_000);
    }
    // The unfiltered endpoint is the worldwide soccer sweep. Combining it
    // with one request per featured league duplicated fixtures and exhausted
    // the shared demo-key budget on even short date ranges.
    const queries = dates.flatMap(date => hasCompetitionFilter
      ? requestedCompetitions.map(competition => `${BASE_URL}/eventsday.php?d=${date}&l=${competition.sportsDbLeagueId}`)
      : [`${BASE_URL}/eventsday.php?d=${date}&s=Soccer`]);
    const responses = await mapWithConcurrency(queries, 4, url => {
      recordRequest(this.id);
      return fetchJson<any>(this.id, url).catch(() => ({ events: [] }));
    });
    const deduplicated = new Map<string, Match>();
    responses.forEach(response => {
      (response.events ?? []).map(mapMatch).forEach((match: Match) => deduplicated.set(match.id, match));
    });
    const rangeStart = new Date(query.dateFromUtc).getTime();
    const rangeEnd = new Date(query.dateToUtc).getTime();
    return [...deduplicated.values()].filter(match => {
      if (!match.kickoffUtc) return true;
      const kickoff = new Date(match.kickoffUtc).getTime();
      return kickoff >= rangeStart && kickoff <= rangeEnd;
    }).sort((a, b) => {
      const competitionOrder = (FEATURED_COMPETITION_PRIORITY.get(a.competitionId) ?? Number.MAX_SAFE_INTEGER)
        - (FEATURED_COMPETITION_PRIORITY.get(b.competitionId) ?? Number.MAX_SAFE_INTEGER);
      return competitionOrder || (a.kickoffUtc ?? '').localeCompare(b.kickoffUtc ?? '');
    });
  }

  async getMatch(providerMatchId: string): Promise<Match | null> {
    recordRequest(this.id);
    const response = await fetchJson<any>(this.id, `${BASE_URL}/lookupevent.php?id=${providerMatchId}`);
    return response.events?.[0] ? mapMatch(response.events[0]) : null;
  }

  async getPlayerSearch(name: string): Promise<PlayerSearchResult[]> {
    const query = name.trim();
    if (!query) return [];
    recordRequest(this.id);
    const response = await fetchJson<any>(this.id, `${BASE_URL}/searchplayers.php?p=${encodeURIComponent(query)}`)
      .catch(() => ({ player: [] }));
    return (response.player ?? [])
      .filter((raw: any) => (raw.strSport ?? 'Soccer') === 'Soccer')
      .slice(0, 20)
      .map((raw: any): PlayerSearchResult => ({
        id: `thesportsdb:${raw.idPlayer}`,
        name: raw.strPlayer ?? 'Unknown',
        photoUrl: raw.strCutout || raw.strThumb || null,
        nationality: raw.strNationality ?? null,
        position: raw.strPosition ?? null,
        currentTeamName: raw.strTeam ?? null,
        currentTeamId: raw.idTeam ? `thesportsdb:${raw.idTeam}` : null,
        source: 'thesportsdb',
      }));
  }

  async getPlayerProfile(providerPlayerId: string): Promise<PlayerProfile | null> {
    const id = providerPlayerId.includes(':') ? providerPlayerId.split(':').slice(1).join(':') : providerPlayerId;
    recordRequest(this.id);
    const lookup = await fetchJson<any>(this.id, `${BASE_URL}/lookupplayer.php?id=${id}`).catch(() => ({ players: [] }));
    const raw = lookup.players?.[0];
    if (!raw) return null;

    const [former, honours] = await Promise.all([
      fetchJson<any>(this.id, `${BASE_URL}/lookupformerteams.php?id=${id}`).catch(() => ({ formerteams: [] })),
      fetchJson<any>(this.id, `${BASE_URL}/lookuphonours.php?id=${id}`).catch(() => ({ honours: [] })),
    ]);

    const career: PlayerCareerEntry[] = (former.formerteams ?? [])
      .filter((entry: any) => (entry.strSport ?? 'Soccer') === 'Soccer')
      .map((entry: any): PlayerCareerEntry => ({
        teamName: entry.strFormerTeam ?? 'Unknown',
        teamId: entry.idFormerTeam ? `thesportsdb:${entry.idFormerTeam}` : null,
        fromYear: entry.strJoined ? String(entry.strJoined).slice(0, 4) : null,
        toYear: entry.strDeparted ? String(entry.strDeparted).slice(0, 4) : null,
        isLoan: /loan/i.test(String(entry.strFormerTeam ?? '')),
      }));

    const honourList: PlayerHonour[] = (honours.honours ?? [])
      .filter((entry: any) => (entry.strSport ?? 'Soccer') === 'Soccer')
      .map((entry: any): PlayerHonour => ({
        title: entry.strHonour ?? 'Honour',
        season: entry.strSeason ?? null,
        teamName: entry.strTeam ?? null,
      }));

    const socials: { label: string; url: string }[] = [];
    const withProtocol = (value: string) => (/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (raw.strTwitter) socials.push({ label: 'Twitter/X', url: withProtocol(raw.strTwitter) });
    if (raw.strInstagram) socials.push({ label: 'Instagram', url: withProtocol(raw.strInstagram) });
    if (raw.strFacebook) socials.push({ label: 'Facebook', url: withProtocol(raw.strFacebook) });

    return {
      id: `thesportsdb:${raw.idPlayer}`,
      name: raw.strPlayer ?? 'Unknown',
      fullName: raw.strPlayerAlternate || raw.strPlayer || null,
      photoUrl: raw.strCutout || raw.strThumb || null,
      nationality: raw.strNationality ?? null,
      position: raw.strPosition ?? null,
      birthDate: raw.dateBorn && raw.dateBorn !== '0000-00-00' ? raw.dateBorn : null,
      birthPlace: raw.strBirthLocation ?? null,
      heightCm: parseHeightCm(raw.strHeight),
      weightKg: parseWeightKg(raw.strWeight),
      currentTeamName: raw.strTeam ?? null,
      currentTeamId: raw.idTeam ? `thesportsdb:${raw.idTeam}` : null,
      bio: raw.strDescriptionEN ? String(raw.strDescriptionEN).trim() : null,
      bioSource: raw.strDescriptionEN ? 'TheSportsDB' : null,
      bioSourceUrl: raw.strWebsite ? withProtocol(raw.strWebsite) : null,
      career,
      honours: honourList,
      socials,
      sources: ['thesportsdb'],
      fetchedAtUtc: new Date().toISOString(),
    };
  }

  async getStandings(): Promise<StandingRow[]> { return []; }
  async getTeams(): Promise<Team[]> { return []; }
  async getTeam(): Promise<Team | null> { return null; }
  async getHeadToHead(): Promise<HeadToHeadResult> { return { matches: [], totalMeetings: 0 }; }
  async getForm(): Promise<FormResult> { return { lastFive: [], homeForm: [], awayForm: [] }; }
}

export const theSportsDbProvider = new TheSportsDbProvider();

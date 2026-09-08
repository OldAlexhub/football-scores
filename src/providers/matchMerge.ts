import type { CompetitionCatalogItem } from '../config/competitionCatalog';
import type { Match, MatchScore, MatchStatus, ProviderId } from '../types/domain';
import { canonicalTeam, sameFixture } from './nameMatch';

/**
 * Reconciles fixture lists from several keyless providers into one
 * de-duplicated list. The app has no single authoritative source, so each
 * field is taken from whichever provider is most trustworthy *for that field*
 * (live status from ESPN, crests from TheSportsDB, and so on) rather than
 * letting one provider win the whole record.
 *
 * Pure module — inject `resolveCatalog` so this file never imports the
 * competition catalog at runtime and stays unit-testable.
 */

/** Whose id/attribution wins when a fixture is seen by several providers. */
const IDENTITY_PRECEDENCE: ProviderId[] = [
  'espn', 'thesportsdb', 'openligadb', 'openfootball', 'api-football', 'football-data-org',
];
/** Crest quality order (TheSportsDB has the best badge coverage). */
const CREST_PRECEDENCE: ProviderId[] = [
  'thesportsdb', 'espn', 'openligadb', 'api-football', 'football-data-org', 'openfootball',
];
/** Providers whose kickoff carries a real UTC offset (not a noon guess). */
const TIMESTAMPED: ReadonlySet<ProviderId> = new Set(['espn', 'thesportsdb', 'openligadb', 'api-football', 'football-data-org']);

const LIVE_STATUSES: ReadonlySet<MatchStatus> = new Set(['live', 'half_time']);

export interface MergeContext {
  previous?: Match[];
  resolveCatalog: (match: Match) => CompetitionCatalogItem | null;
}

function rank(order: ProviderId[], id: ProviderId): number {
  const index = order.indexOf(id);
  return index === -1 ? order.length + 1 : index;
}

function firstNonNull<T>(members: Match[], getter: (m: Match) => T | null | undefined): T | null {
  for (const member of members) {
    const value = getter(member);
    if (value != null) return value as T;
  }
  return null;
}

function scoreHasValue(score: MatchScore | null | undefined): boolean {
  return !!score && (score.home != null || score.away != null);
}

/** Flip a member's home/away-paired fields so every cluster member faces the same way. */
function orientLike(member: Match, reference: Match): Match {
  if (canonicalTeam(member.homeTeamName) === canonicalTeam(reference.homeTeamName)) return member;
  if (canonicalTeam(member.homeTeamName) !== canonicalTeam(reference.awayTeamName)) return member;
  const swapScore = (s: MatchScore | null): MatchScore | null =>
    s ? { home: s.away, away: s.home } : null;
  return {
    ...member,
    homeTeamId: member.awayTeamId,
    homeTeamName: member.awayTeamName,
    homeTeamInitials: member.awayTeamInitials,
    homeTeamCrestUrl: member.awayTeamCrestUrl,
    awayTeamId: member.homeTeamId,
    awayTeamName: member.homeTeamName,
    awayTeamInitials: member.homeTeamInitials,
    awayTeamCrestUrl: member.homeTeamCrestUrl,
    halfTimeScore: swapScore(member.halfTimeScore),
    fullTimeScore: swapScore(member.fullTimeScore),
    extraTimeScore: swapScore(member.extraTimeScore),
    penaltyScore: swapScore(member.penaltyScore),
    currentScore: swapScore(member.currentScore),
    winner: member.winner === 'home' ? 'away' : member.winner === 'away' ? 'home' : member.winner,
  };
}

function mergeCluster(rawMembers: Match[], ctx: MergeContext): { match: Match; tier: number } {
  const byIdentity = [...rawMembers].sort((a, b) => rank(IDENTITY_PRECEDENCE, a.providerId) - rank(IDENTITY_PRECEDENCE, b.providerId));
  const reference = byIdentity[0];
  const members = byIdentity.map(member => orientLike(member, reference));

  const linked = ctx.previous?.find(prev => members.some(member => sameFixture(prev, member)));
  const identity = linked ?? members[0];

  const sourceIds = [...new Set(members.map(m => m.providerId))]
    .sort((a, b) => rank(IDENTITY_PRECEDENCE, a) - rank(IDENTITY_PRECEDENCE, b));
  const attribution = [...new Set(members.map(m => m.attribution).filter(Boolean))].join(' · ') || identity.attribution;

  // --- status / live score ---
  const liveMember = members.find(m => LIVE_STATUSES.has(m.status));
  const finishedMember = members.find(m => m.status === 'finished' && (scoreHasValue(m.fullTimeScore) || scoreHasValue(m.currentScore)));
  const scoreMember = members.find(m => scoreHasValue(m.currentScore));
  const statusMember = liveMember ?? finishedMember ?? scoreMember ?? members[0];

  // --- kickoff ---
  const kickoffMember =
    members.find(m => !m.kickoffUnknown && m.kickoffUtc && TIMESTAMPED.has(m.providerId)) ??
    members.find(m => !m.kickoffUnknown && m.kickoffUtc) ??
    members.find(m => m.kickoffUtc) ??
    members[0];

  // --- crests ---
  const crestOrder = [...members].sort((a, b) => rank(CREST_PRECEDENCE, a.providerId) - rank(CREST_PRECEDENCE, b.providerId));

  // --- competition ---
  let catalog: CompetitionCatalogItem | null = null;
  for (const member of members) {
    catalog = ctx.resolveCatalog(member);
    if (catalog) break;
  }

  const merged: Match = {
    ...reference,
    id: identity.id,
    providerId: identity.providerId,
    providerMatchId: identity.providerMatchId,
    attribution,
    sourceIds,
    catalogKey: catalog?.key ?? null,

    competitionId: catalog?.canonicalId ?? reference.competitionId,
    competitionName: catalog?.canonicalName ?? reference.competitionName,
    competitionEmblemUrl: firstNonNull(crestOrder, m => m.competitionEmblemUrl),
    country: firstNonNull(members, m => m.country),
    season: firstNonNull(members, m => m.season),
    stage: firstNonNull(members, m => m.stage),
    round: firstNonNull(members, m => m.round),
    matchweek: firstNonNull(members, m => m.matchweek),

    homeTeamId: reference.homeTeamId,
    homeTeamName: reference.homeTeamName,
    homeTeamInitials: reference.homeTeamInitials,
    homeTeamCrestUrl: firstNonNull(crestOrder, m => m.homeTeamCrestUrl),
    awayTeamId: reference.awayTeamId,
    awayTeamName: reference.awayTeamName,
    awayTeamInitials: reference.awayTeamInitials,
    awayTeamCrestUrl: firstNonNull(crestOrder, m => m.awayTeamCrestUrl),

    kickoffUtc: kickoffMember.kickoffUtc,
    kickoffUnknown: kickoffMember.kickoffUnknown,

    status: statusMember.status,
    statusDetail: statusMember.statusDetail ?? firstNonNull(members, m => m.statusDetail),
    elapsedMinutes: statusMember.elapsedMinutes ?? firstNonNull(members, m => m.elapsedMinutes),
    injuryTimeMinutes: statusMember.injuryTimeMinutes ?? firstNonNull(members, m => m.injuryTimeMinutes),
    halfTimeScore: (statusMember.halfTimeScore && scoreHasValue(statusMember.halfTimeScore))
      ? statusMember.halfTimeScore
      : firstNonNull(members, m => (scoreHasValue(m.halfTimeScore) ? m.halfTimeScore : null)),
    currentScore: (statusMember.currentScore && scoreHasValue(statusMember.currentScore))
      ? statusMember.currentScore
      : firstNonNull(members, m => (scoreHasValue(m.currentScore) ? m.currentScore : null)),
    fullTimeScore: firstNonNull(members, m => (scoreHasValue(m.fullTimeScore) ? m.fullTimeScore : null)),
    extraTimeScore: firstNonNull(members, m => (scoreHasValue(m.extraTimeScore) ? m.extraTimeScore : null)),
    penaltyScore: firstNonNull(members, m => (scoreHasValue(m.penaltyScore) ? m.penaltyScore : null)),
    winner: firstNonNull(members, m => m.winner),

    venue: firstNonNull(members, m => m.venue),
    referee: firstNonNull(members, m => m.referee),
    attendance: firstNonNull(members, m => m.attendance),
    lastProviderUpdateUtc: new Date().toISOString(),
    isKnockout: members.some(m => m.isKnockout) || !!catalog?.knockout,
    extraTimePossible: members.some(m => m.isKnockout) || !!catalog?.knockout,
  };

  return { match: merged, tier: catalog?.tier ?? 3 };
}

/** Cluster fixtures across providers and field-merge each cluster. */
export function mergeMatches(groups: Match[][], ctx: MergeContext): Match[] {
  const all = groups.flat();
  const clusters: Match[][] = [];

  for (const match of all) {
    const target = clusters.find(cluster => cluster.some(member => sameFixture(member, match)));
    if (target) target.push(match);
    else clusters.push([match]);
  }

  return clusters
    .map(cluster => mergeCluster(cluster, ctx))
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return (a.match.kickoffUtc ?? '').localeCompare(b.match.kickoffUtc ?? '');
    })
    .map(entry => entry.match);
}

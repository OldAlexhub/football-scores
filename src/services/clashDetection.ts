export type ConflictSeverity = 'none' | 'short' | 'partial' | 'major' | 'nearly_complete';

export interface ClashInput {
  matchId: string;
  kickoffUtc: string | null;
  kickoffUnknown: boolean;
  estimatedDurationMinutes: number;
  extraTimePossible: boolean;
  priority: 'low' | 'normal' | 'high';
  isFavoriteTeamMatch: boolean;
  watchLater: boolean;
}

export interface ScheduledInterval extends ClashInput {
  startMs: number;
  endMs: number;
}

export interface PairOverlap {
  matchIdA: string;
  matchIdB: string;
  overlapMinutes: number;
  severity: ConflictSeverity;
}

export interface ClashGroup {
  matchIds: string[];
  severity: ConflictSeverity;
  overlaps: PairOverlap[];
  suggestedOrder: string[];
}

export interface GapInfo {
  afterMatchId: string;
  beforeMatchId: string;
  gapMinutes: number;
  isBackToBack: boolean;
}

const BACK_TO_BACK_THRESHOLD_MINUTES = 15;

function toScheduledIntervals(inputs: ClashInput[]): ScheduledInterval[] {
  return inputs
    .filter(m => !m.kickoffUnknown && m.kickoffUtc)
    .map(m => {
      const startMs = new Date(m.kickoffUtc as string).getTime();
      return { ...m, startMs, endMs: startMs + m.estimatedDurationMinutes * 60000 };
    })
    .sort((a, b) => a.startMs - b.startMs);
}

function severityFor(overlapMinutes: number, shorterDurationMinutes: number): ConflictSeverity {
  if (overlapMinutes <= 0) return 'none';
  const ratio = overlapMinutes / shorterDurationMinutes;
  if (overlapMinutes <= 15) return 'short';
  if (ratio < 0.5) return 'partial';
  if (ratio < 0.9) return 'major';
  return 'nearly_complete';
}

function severityRank(s: ConflictSeverity): number {
  return { none: 0, short: 1, partial: 2, major: 3, nearly_complete: 4 }[s];
}

function priorityRank(p: 'low' | 'normal' | 'high'): number {
  return { low: 0, normal: 1, high: 2 }[p];
}

export function findPairOverlaps(inputs: ClashInput[]): PairOverlap[] {
  const intervals = toScheduledIntervals(inputs);
  const overlaps: PairOverlap[] = [];
  for (let i = 0; i < intervals.length; i += 1) {
    for (let j = i + 1; j < intervals.length; j += 1) {
      const a = intervals[i];
      const b = intervals[j];
      const overlapMs = Math.min(a.endMs, b.endMs) - Math.max(a.startMs, b.startMs);
      if (overlapMs <= 0) continue;
      const overlapMinutes = Math.round(overlapMs / 60000);
      const shorterDuration = Math.min(a.estimatedDurationMinutes, b.estimatedDurationMinutes);
      overlaps.push({
        matchIdA: a.matchId,
        matchIdB: b.matchId,
        overlapMinutes,
        severity: severityFor(overlapMinutes, shorterDuration),
      });
    }
  }
  return overlaps;
}

/** Groups matches into connected components of mutually-or-transitively overlapping intervals. */
export function groupClashes(inputs: ClashInput[]): ClashGroup[] {
  const intervals = toScheduledIntervals(inputs);
  const overlaps = findPairOverlaps(inputs);
  const adjacency = new Map<string, Set<string>>();
  intervals.forEach(iv => adjacency.set(iv.matchId, new Set()));
  overlaps.forEach(o => {
    adjacency.get(o.matchIdA)?.add(o.matchIdB);
    adjacency.get(o.matchIdB)?.add(o.matchIdA);
  });

  const visited = new Set<string>();
  const groups: ClashGroup[] = [];

  for (const iv of intervals) {
    if (visited.has(iv.matchId)) continue;
    const neighbors = adjacency.get(iv.matchId) ?? new Set();
    if (neighbors.size === 0) continue;

    const componentIds: string[] = [];
    const stack = [iv.matchId];
    while (stack.length) {
      const current = stack.pop() as string;
      if (visited.has(current)) continue;
      visited.add(current);
      componentIds.push(current);
      for (const next of adjacency.get(current) ?? []) {
        if (!visited.has(next)) stack.push(next);
      }
    }

    const groupOverlaps = overlaps.filter(
      o => componentIds.includes(o.matchIdA) && componentIds.includes(o.matchIdB),
    );
    const worstSeverity = groupOverlaps.reduce<ConflictSeverity>(
      (worst, o) => (severityRank(o.severity) > severityRank(worst) ? o.severity : worst),
      'none',
    );

    const componentMatches = intervals.filter(m => componentIds.includes(m.matchId));
    const suggestedOrder = [...componentMatches]
      .sort((a, b) => {
        const priorityDiff = priorityRank(b.priority) - priorityRank(a.priority);
        if (priorityDiff !== 0) return priorityDiff;
        const favoriteDiff = Number(b.isFavoriteTeamMatch) - Number(a.isFavoriteTeamMatch);
        if (favoriteDiff !== 0) return favoriteDiff;
        const watchLaterDiff = Number(a.watchLater) - Number(b.watchLater);
        if (watchLaterDiff !== 0) return watchLaterDiff;
        return a.startMs - b.startMs;
      })
      .map(m => m.matchId);

    groups.push({
      matchIds: componentIds,
      severity: worstSeverity,
      overlaps: groupOverlaps,
      suggestedOrder,
    });
  }

  return groups;
}

export function findGaps(inputs: ClashInput[]): GapInfo[] {
  const intervals = toScheduledIntervals(inputs);
  const gaps: GapInfo[] = [];
  for (let i = 0; i < intervals.length - 1; i += 1) {
    const current = intervals[i];
    const next = intervals[i + 1];
    if (next.startMs < current.endMs) continue; // overlapping, not a gap
    const gapMinutes = Math.round((next.startMs - current.endMs) / 60000);
    gaps.push({
      afterMatchId: current.matchId,
      beforeMatchId: next.matchId,
      gapMinutes,
      isBackToBack: gapMinutes <= BACK_TO_BACK_THRESHOLD_MINUTES,
    });
  }
  return gaps;
}

export function estimatedEndUtc(kickoffUtc: string, estimatedDurationMinutes: number): string {
  return new Date(new Date(kickoffUtc).getTime() + estimatedDurationMinutes * 60000).toISOString();
}

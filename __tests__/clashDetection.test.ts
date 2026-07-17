import { estimatedEndUtc, findGaps, findPairOverlaps, groupClashes, type ClashInput } from '../src/services/clashDetection';

function match(id: string, kickoffIso: string, durationMinutes = 120, overrides: Partial<ClashInput> = {}): ClashInput {
  return {
    matchId: id,
    kickoffUtc: kickoffIso,
    kickoffUnknown: false,
    estimatedDurationMinutes: durationMinutes,
    extraTimePossible: false,
    priority: 'normal',
    isFavoriteTeamMatch: false,
    watchLater: false,
    ...overrides,
  };
}

describe('clash detection', () => {
  it('finds no overlap for sequential matches with a gap', () => {
    const inputs = [
      match('a', '2026-01-10T14:00:00.000Z'),
      match('b', '2026-01-10T17:00:00.000Z'),
    ];
    expect(findPairOverlaps(inputs)).toHaveLength(0);
    const gaps = findGaps(inputs);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].gapMinutes).toBe(60);
    expect(gaps[0].isBackToBack).toBe(false);
  });

  it('detects a back-to-back short gap', () => {
    const inputs = [
      match('a', '2026-01-10T14:00:00.000Z'),
      match('b', '2026-01-10T16:05:00.000Z'),
    ];
    const gaps = findGaps(inputs);
    expect(gaps[0].gapMinutes).toBe(5);
    expect(gaps[0].isBackToBack).toBe(true);
  });

  it('detects a full overlap between two simultaneous matches', () => {
    const inputs = [
      match('a', '2026-01-10T14:00:00.000Z'),
      match('b', '2026-01-10T14:00:00.000Z'),
    ];
    const overlaps = findPairOverlaps(inputs);
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].overlapMinutes).toBe(120);
    expect(overlaps[0].severity).toBe('nearly_complete');
  });

  it('classifies a short overlap correctly', () => {
    const inputs = [
      match('a', '2026-01-10T14:00:00.000Z'),
      match('b', '2026-01-10T15:50:00.000Z'),
    ];
    const overlaps = findPairOverlaps(inputs);
    expect(overlaps[0].overlapMinutes).toBe(10);
    expect(overlaps[0].severity).toBe('short');
  });

  it('groups three overlapping matches into a single clash group', () => {
    const inputs = [
      match('a', '2026-01-10T14:00:00.000Z'),
      match('b', '2026-01-10T14:30:00.000Z'),
      match('c', '2026-01-10T15:00:00.000Z'),
    ];
    const groups = groupClashes(inputs);
    expect(groups).toHaveLength(1);
    expect(groups[0].matchIds.sort()).toEqual(['a', 'b', 'c']);
  });

  it('ignores matches with unknown kickoff times', () => {
    const inputs: ClashInput[] = [
      match('a', '2026-01-10T14:00:00.000Z'),
      { ...match('b', ''), kickoffUtc: null, kickoffUnknown: true },
    ];
    expect(findPairOverlaps(inputs)).toHaveLength(0);
    expect(groupClashes(inputs)).toHaveLength(0);
  });

  it('orders the suggested sequence by priority, then favorite status, then kickoff time', () => {
    const inputs = [
      match('low', '2026-01-10T14:00:00.000Z', 120, { priority: 'low' }),
      match('high', '2026-01-10T14:15:00.000Z', 120, { priority: 'high' }),
      match('fav', '2026-01-10T14:30:00.000Z', 120, { priority: 'normal', isFavoriteTeamMatch: true }),
    ];
    const groups = groupClashes(inputs);
    expect(groups[0].suggestedOrder[0]).toBe('high');
    expect(groups[0].suggestedOrder[1]).toBe('fav');
    expect(groups[0].suggestedOrder[2]).toBe('low');
  });

  it('computes the estimated end time from kickoff + duration', () => {
    expect(estimatedEndUtc('2026-01-10T14:00:00.000Z', 120)).toBe('2026-01-10T16:00:00.000Z');
  });
});

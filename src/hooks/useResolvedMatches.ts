import { useEffect, useState } from 'react';
import { fetchMatches, resolveMatchById } from '../providers/providerManager';
import { addDays } from '../utils/dates';
import type { Match } from '../types/domain';

/**
 * Resolves a set of matchIds (from watch-plan items, reminders, or
 * predictions) to full Match objects. Most ids resolve from one broad
 * window fetch; any that don't (older results, a competition outside the
 * window) fall back to a per-id provider lookup.
 */
export function useResolvedMatches(matchIds: string[]): { matches: Record<string, Match>; loading: boolean } {
  const [matches, setMatches] = useState<Record<string, Match>>({});
  const [loading, setLoading] = useState(true);
  const key = matchIds.slice().sort().join(',');

  useEffect(() => {
    let mounted = true;
    if (matchIds.length === 0) {
      setMatches({});
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const from = addDays(new Date(), -14).toISOString();
    const to = addDays(new Date(), 30).toISOString();

    fetchMatches({ dateFromUtc: from, dateToUtc: to }).then(async result => {
      if (!mounted) return;
      const map: Record<string, Match> = {};
      for (const m of result.data) {
        map[m.id] = m;
      }
      const missing = matchIds.filter(id => !map[id]);
      const resolved = await Promise.all(missing.map(id => resolveMatchById(id)));
      resolved.forEach((m, i) => {
        if (m) map[missing[i]] = m;
      });
      if (mounted) {
        setMatches(map);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { matches, loading };
}

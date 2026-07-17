import type { Match, WatchPlanItem } from '../types/domain';

/**
 * A match's result is hidden when Spoiler Shield is enabled for it (either
 * because the user turned it on for this specific watch-plan item, or the
 * user's global default applies to a match with no watch-plan item yet) and
 * the user has not chosen to reveal it. Only matches with a determined
 * result can be shielded — a scheduled match has nothing to hide yet.
 */
export function shouldShieldMatch(
  match: Match,
  planItem: WatchPlanItem | null,
  defaultSpoilerShieldEnabled: boolean,
): boolean {
  const hasResult = match.status === 'finished' || match.status === 'live' || match.status === 'half_time';
  if (!hasResult) return false;

  const enabled = planItem ? planItem.spoilerShieldEnabled : defaultSpoilerShieldEnabled;
  if (!enabled) return false;

  if (planItem?.spoilerRevealedPermanently) return false;
  if (planItem?.spoilerRevealed) return false;

  return true;
}

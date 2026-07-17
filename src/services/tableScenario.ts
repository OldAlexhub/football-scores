import type { StandingRow } from '../types/domain';

export interface ScenarioMatchInput {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
}

/**
 * Generic points → goal difference → goals-for tie-break, used whenever a
 * competition-specific rule set isn't configured. Always paired with a
 * disclaimer in the UI — official rules (head-to-head, disciplinary points,
 * playoffs) may order tied teams differently.
 */
export const DEFAULT_TIE_BREAK = (a: StandingRow, b: StandingRow): number => {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
  return b.goalsFor - a.goalsFor;
};

export type TieBreakFn = (a: StandingRow, b: StandingRow) => number;

export const COMPETITION_TIE_BREAKS: Record<string, TieBreakFn> = {
  // Example override: competitions that rank by head-to-head before goal
  // difference would register a dedicated function here by competition id.
};

export function getTieBreakForCompetition(competitionId: string): TieBreakFn {
  return COMPETITION_TIE_BREAKS[competitionId] ?? DEFAULT_TIE_BREAK;
}

export function applyScenario(
  baseRows: StandingRow[],
  scenarioMatches: ScenarioMatchInput[],
  tieBreak: TieBreakFn = DEFAULT_TIE_BREAK,
): StandingRow[] {
  const rowsByTeam = new Map<string, StandingRow>(baseRows.map(r => [r.teamId, { ...r }]));

  for (const match of scenarioMatches) {
    const home = rowsByTeam.get(match.homeTeamId);
    const away = rowsByTeam.get(match.awayTeamId);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;
    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;

    if (match.homeScore > match.awayScore) {
      home.wins += 1; home.points += 3; away.losses += 1;
    } else if (match.awayScore > match.homeScore) {
      away.wins += 1; away.points += 3; home.losses += 1;
    } else {
      home.draws += 1; away.draws += 1; home.points += 1; away.points += 1;
    }
    home.isProvisional = true;
    away.isProvisional = true;
  }

  const result = Array.from(rowsByTeam.values()).sort(tieBreak);
  return result.map((row, index) => ({ ...row, position: index + 1 }));
}

import type { MatchScore, PredictionOutcome } from '../types/domain';

export interface GradingResult {
  isCorrectOutcome: boolean;
  isExactScore: boolean;
  pointsAwarded: number;
}

function outcomeFromScore(score: MatchScore): PredictionOutcome | null {
  if (score.home == null || score.away == null) return null;
  if (score.home > score.away) return 'home';
  if (score.away > score.home) return 'away';
  return 'draw';
}

/**
 * Correct outcome = 3 points. Exact score = 5 points total (not additive
 * with the outcome points — an exact score already implies the correct
 * outcome). Incorrect outcome = 0 points.
 */
export function gradePrediction(
  prediction: { outcome: PredictionOutcome; homeScore: number; awayScore: number },
  finalScore: MatchScore,
): GradingResult | null {
  const actualOutcome = outcomeFromScore(finalScore);
  if (actualOutcome === null) {
    return null;
  }

  const isExactScore = prediction.homeScore === finalScore.home && prediction.awayScore === finalScore.away;
  const isCorrectOutcome = prediction.outcome === actualOutcome;

  const pointsAwarded = isExactScore ? 5 : isCorrectOutcome ? 3 : 0;

  return { isCorrectOutcome, isExactScore, pointsAwarded };
}

export function isMatchGradable(status: string): boolean {
  return status === 'finished';
}

export function outcomeFromScoreInputs(homeScore: number, awayScore: number): PredictionOutcome {
  if (homeScore > awayScore) return 'home';
  if (awayScore > homeScore) return 'away';
  return 'draw';
}

export interface PredictionValidationInput {
  outcome: PredictionOutcome;
  homeScore: number;
  awayScore: number;
}

export interface PredictionValidationResult {
  valid: boolean;
  errorKey?: string;
}

const MAX_REASONABLE_SCORE = 20;

export function validatePrediction(input: PredictionValidationInput): PredictionValidationResult {
  if (!Number.isInteger(input.homeScore) || !Number.isInteger(input.awayScore)) {
    return { valid: false, errorKey: 'predict.validation.integer' };
  }
  if (input.homeScore < 0 || input.awayScore < 0) {
    return { valid: false, errorKey: 'predict.validation.negative' };
  }
  if (input.homeScore > MAX_REASONABLE_SCORE || input.awayScore > MAX_REASONABLE_SCORE) {
    return { valid: false, errorKey: 'predict.validation.tooHigh' };
  }
  const derivedOutcome = outcomeFromScoreInputs(input.homeScore, input.awayScore);
  if (derivedOutcome !== input.outcome) {
    return { valid: false, errorKey: 'predict.validation.contradictory' };
  }
  return { valid: true };
}

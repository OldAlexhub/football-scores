import type { PredictionRecord } from '../storage/repositories/predictionsRepo';

export interface PredictionStats {
  total: number;
  graded: number;
  pending: number;
  correctOutcomes: number;
  exactScores: number;
  outcomeAccuracy: number | null;
  exactScoreRate: number | null;
  totalPoints: number;
  averagePoints: number | null;
  currentStreak: number;
  bestStreak: number;
}

export function computePredictionStats(predictions: PredictionRecord[]): PredictionStats {
  const graded = predictions.filter(p => p.gradedAt !== null);
  const pending = predictions.length - graded.length;
  const correctOutcomes = graded.filter(p => p.isCorrectOutcome).length;
  const exactScores = graded.filter(p => p.isExactScore).length;
  const totalPoints = graded.reduce((sum, p) => sum + (p.pointsAwarded ?? 0), 0);

  const chronological = [...graded].sort((a, b) => new Date(a.gradedAt as string).getTime() - new Date(b.gradedAt as string).getTime());
  let currentStreak = 0;
  let bestStreak = 0;
  let running = 0;
  for (const p of chronological) {
    if (p.isCorrectOutcome) {
      running += 1;
      bestStreak = Math.max(bestStreak, running);
    } else {
      running = 0;
    }
  }
  for (let i = chronological.length - 1; i >= 0; i -= 1) {
    if (chronological[i].isCorrectOutcome) currentStreak += 1;
    else break;
  }

  return {
    total: predictions.length,
    graded: graded.length,
    pending,
    correctOutcomes,
    exactScores,
    outcomeAccuracy: graded.length > 0 ? correctOutcomes / graded.length : null,
    exactScoreRate: graded.length > 0 ? exactScores / graded.length : null,
    totalPoints,
    averagePoints: graded.length > 0 ? totalPoints / graded.length : null,
    currentStreak,
    bestStreak,
  };
}

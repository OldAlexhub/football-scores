import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  deletePrediction,
  getPredictionByMatch,
  gradePrediction as gradePredictionRow,
  listPredictions,
  savePrediction as savePredictionRow,
  ungrade,
  type MatchContextForPrediction,
  type PredictionRecord,
} from '../storage/repositories/predictionsRepo';
import { gradePrediction, isMatchGradable } from '../services/predictionScoring';
import type { Match, PredictionOutcome } from '../types/domain';

interface PredictionsContextValue {
  predictions: PredictionRecord[];
  loading: boolean;
  getPredictionFor: (matchId: string) => PredictionRecord | undefined;
  save: (
    match: Match,
    input: { outcome: PredictionOutcome; homeScore: number; awayScore: number; confidence: 1 | 2 | 3 | 4 | 5; note: string },
  ) => Promise<void>;
  remove: (matchId: string) => Promise<void>;
  regradeIfNeeded: (match: Match) => Promise<void>;
  refresh: () => Promise<void>;
}

const PredictionsContext = createContext<PredictionsContextValue>({
  predictions: [],
  loading: true,
  getPredictionFor: () => undefined,
  save: async () => undefined,
  remove: async () => undefined,
  regradeIfNeeded: async () => undefined,
  refresh: async () => undefined,
});

export function PredictionsProvider({ children }: { children: React.ReactNode }) {
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setPredictions(await listPredictions());
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getPredictionFor = useCallback((matchId: string) => predictions.find(p => p.matchId === matchId), [predictions]);

  const save = useCallback(async (
    match: Match,
    input: { outcome: PredictionOutcome; homeScore: number; awayScore: number; confidence: 1 | 2 | 3 | 4 | 5; note: string },
  ) => {
    const context: MatchContextForPrediction = {
      competitionId: match.competitionId,
      competitionName: match.competitionName,
      homeTeamId: match.homeTeamId,
      homeTeamName: match.homeTeamName,
      awayTeamId: match.awayTeamId,
      awayTeamName: match.awayTeamName,
      kickoffUtc: match.kickoffUtc,
    };
    await savePredictionRow(match.id, input, context);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (matchId: string) => {
    await deletePrediction(matchId);
    await refresh();
  }, [refresh]);

  const regradeIfNeeded = useCallback(async (match: Match) => {
    const existing = await getPredictionByMatch(match.id);
    if (!existing) return;

    if (match.status === 'cancelled' || match.status === 'abandoned') {
      if (existing.gradedAt) await ungrade(match.id);
      return;
    }
    if (!isMatchGradable(match.status) || !match.fullTimeScore) {
      return;
    }
    const grading = gradePrediction(
      { outcome: existing.outcome, homeScore: existing.homeScore, awayScore: existing.awayScore },
      match.fullTimeScore,
    );
    if (!grading) return;
    await gradePredictionRow(match.id, grading);
    await refresh();
  }, [refresh]);

  return (
    <PredictionsContext.Provider value={{ predictions, loading, getPredictionFor, save, remove, regradeIfNeeded, refresh }}>
      {children}
    </PredictionsContext.Provider>
  );
}

export function usePredictions(): PredictionsContextValue {
  return useContext(PredictionsContext);
}

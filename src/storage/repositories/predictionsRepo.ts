import { runExecute, runQuery } from '../db';
import { generateId } from '../../utils/id';
import type { Prediction, PredictionOutcome } from '../../types/domain';

interface PredictionRow {
  id: string;
  match_id: string;
  outcome: PredictionOutcome;
  home_score: number;
  away_score: number;
  confidence: number;
  note: string;
  created_at: string;
  updated_at: string;
  locked_at_utc: string | null;
  graded_at: string | null;
  points_awarded: number | null;
  is_exact_score: number | null;
  is_correct_outcome: number | null;
  competition_id: string | null;
  competition_name: string | null;
  home_team_id: string | null;
  home_team_name: string | null;
  away_team_id: string | null;
  away_team_name: string | null;
  kickoff_utc: string | null;
}

export interface PredictionRecord extends Prediction {
  competitionId: string | null;
  competitionName: string | null;
  homeTeamId: string | null;
  homeTeamName: string | null;
  awayTeamId: string | null;
  awayTeamName: string | null;
  kickoffUtc: string | null;
}

function fromRow(row: PredictionRow): PredictionRecord {
  return {
    id: row.id,
    matchId: row.match_id,
    outcome: row.outcome,
    homeScore: row.home_score,
    awayScore: row.away_score,
    confidence: row.confidence as 1 | 2 | 3 | 4 | 5,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lockedAtUtc: row.locked_at_utc,
    gradedAt: row.graded_at,
    pointsAwarded: row.points_awarded,
    isExactScore: row.is_exact_score === null ? null : !!row.is_exact_score,
    isCorrectOutcome: row.is_correct_outcome === null ? null : !!row.is_correct_outcome,
    competitionId: row.competition_id,
    competitionName: row.competition_name,
    homeTeamId: row.home_team_id,
    homeTeamName: row.home_team_name,
    awayTeamId: row.away_team_id,
    awayTeamName: row.away_team_name,
    kickoffUtc: row.kickoff_utc,
  };
}

export async function listPredictions(): Promise<PredictionRecord[]> {
  const rows = await runQuery<PredictionRow>('SELECT * FROM predictions ORDER BY created_at DESC');
  return rows.map(fromRow);
}

export async function getPredictionByMatch(matchId: string): Promise<PredictionRecord | null> {
  const rows = await runQuery<PredictionRow>('SELECT * FROM predictions WHERE match_id = ?', [matchId]);
  return rows[0] ? fromRow(rows[0]) : null;
}

export interface MatchContextForPrediction {
  competitionId: string;
  competitionName: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  kickoffUtc: string | null;
}

export async function savePrediction(
  matchId: string,
  input: {
    outcome: PredictionOutcome;
    homeScore: number;
    awayScore: number;
    confidence: 1 | 2 | 3 | 4 | 5;
    note: string;
  },
  context: MatchContextForPrediction,
): Promise<PredictionRecord> {
  const existing = await getPredictionByMatch(matchId);
  const now = new Date().toISOString();
  const lockedAtUtc = context.kickoffUtc;

  if (existing) {
    const merged: PredictionRecord = {
      ...existing,
      ...input,
      updatedAt: now,
      lockedAtUtc,
      gradedAt: null,
      pointsAwarded: null,
      isExactScore: null,
      isCorrectOutcome: null,
    };
    await runExecute(
      `UPDATE predictions SET outcome = ?, home_score = ?, away_score = ?, confidence = ?, note = ?,
        updated_at = ?, locked_at_utc = ?, graded_at = NULL, points_awarded = NULL,
        is_exact_score = NULL, is_correct_outcome = NULL, kickoff_utc = ? WHERE match_id = ?`,
      [
        merged.outcome,
        merged.homeScore,
        merged.awayScore,
        merged.confidence,
        merged.note,
        now,
        lockedAtUtc,
        context.kickoffUtc,
        matchId,
      ],
    );
    return merged;
  }

  const created: PredictionRecord = {
    id: generateId(),
    matchId,
    ...input,
    createdAt: now,
    updatedAt: now,
    lockedAtUtc,
    gradedAt: null,
    pointsAwarded: null,
    isExactScore: null,
    isCorrectOutcome: null,
    competitionId: context.competitionId,
    competitionName: context.competitionName,
    homeTeamId: context.homeTeamId,
    homeTeamName: context.homeTeamName,
    awayTeamId: context.awayTeamId,
    awayTeamName: context.awayTeamName,
    kickoffUtc: context.kickoffUtc,
  };
  await runExecute(
    `INSERT INTO predictions (id, match_id, outcome, home_score, away_score, confidence, note,
      created_at, updated_at, locked_at_utc, competition_id, competition_name, home_team_id,
      home_team_name, away_team_id, away_team_name, kickoff_utc)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      created.id,
      created.matchId,
      created.outcome,
      created.homeScore,
      created.awayScore,
      created.confidence,
      created.note,
      created.createdAt,
      created.updatedAt,
      created.lockedAtUtc,
      created.competitionId,
      created.competitionName,
      created.homeTeamId,
      created.homeTeamName,
      created.awayTeamId,
      created.awayTeamName,
      created.kickoffUtc,
    ],
  );
  return created;
}

export async function gradePrediction(
  matchId: string,
  grading: { pointsAwarded: number; isExactScore: boolean; isCorrectOutcome: boolean },
): Promise<void> {
  await runExecute(
    `UPDATE predictions SET graded_at = ?, points_awarded = ?, is_exact_score = ?,
      is_correct_outcome = ? WHERE match_id = ?`,
    [
      new Date().toISOString(),
      grading.pointsAwarded,
      grading.isExactScore ? 1 : 0,
      grading.isCorrectOutcome ? 1 : 0,
      matchId,
    ],
  );
}

export async function ungrade(matchId: string): Promise<void> {
  await runExecute(
    `UPDATE predictions SET graded_at = NULL, points_awarded = NULL, is_exact_score = NULL,
      is_correct_outcome = NULL WHERE match_id = ?`,
    [matchId],
  );
}

export async function deletePrediction(matchId: string): Promise<void> {
  await runExecute('DELETE FROM predictions WHERE match_id = ?', [matchId]);
}

export async function clearPredictions(): Promise<void> {
  await runExecute('DELETE FROM predictions');
}

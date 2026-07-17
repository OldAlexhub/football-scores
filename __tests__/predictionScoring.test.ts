import { gradePrediction, isMatchGradable, outcomeFromScoreInputs, validatePrediction } from '../src/services/predictionScoring';

describe('prediction scoring', () => {
  it('awards 5 points for an exact score', () => {
    const result = gradePrediction(
      { outcome: 'home', homeScore: 2, awayScore: 1 },
      { home: 2, away: 1 },
    );
    expect(result).toEqual({ isCorrectOutcome: true, isExactScore: true, pointsAwarded: 5 });
  });

  it('awards 3 points for a correct outcome without an exact score', () => {
    const result = gradePrediction(
      { outcome: 'home', homeScore: 1, awayScore: 0 },
      { home: 3, away: 1 },
    );
    expect(result).toEqual({ isCorrectOutcome: true, isExactScore: false, pointsAwarded: 3 });
  });

  it('awards 0 points for an incorrect outcome', () => {
    const result = gradePrediction(
      { outcome: 'home', homeScore: 1, awayScore: 0 },
      { home: 0, away: 2 },
    );
    expect(result).toEqual({ isCorrectOutcome: false, isExactScore: false, pointsAwarded: 0 });
  });

  it('never awards 8 points (points are not additive)', () => {
    const result = gradePrediction(
      { outcome: 'draw', homeScore: 1, awayScore: 1 },
      { home: 1, away: 1 },
    );
    expect(result?.pointsAwarded).toBe(5);
    expect(result?.pointsAwarded).not.toBe(8);
  });

  it('returns null when the final score is unavailable', () => {
    const result = gradePrediction(
      { outcome: 'home', homeScore: 1, awayScore: 0 },
      { home: null, away: null },
    );
    expect(result).toBeNull();
  });

  it('derives the outcome from a score', () => {
    expect(outcomeFromScoreInputs(2, 1)).toBe('home');
    expect(outcomeFromScoreInputs(1, 2)).toBe('away');
    expect(outcomeFromScoreInputs(1, 1)).toBe('draw');
  });

  it('only considers finished matches gradable', () => {
    expect(isMatchGradable('finished')).toBe(true);
    expect(isMatchGradable('scheduled')).toBe(false);
    expect(isMatchGradable('postponed')).toBe(false);
    expect(isMatchGradable('cancelled')).toBe(false);
  });

  describe('validatePrediction', () => {
    it('rejects negative scores', () => {
      expect(validatePrediction({ outcome: 'home', homeScore: -1, awayScore: 0 }).valid).toBe(false);
    });

    it('rejects non-integer scores', () => {
      expect(validatePrediction({ outcome: 'home', homeScore: 1.5, awayScore: 0 }).valid).toBe(false);
    });

    it('rejects unreasonably high scores', () => {
      expect(validatePrediction({ outcome: 'home', homeScore: 99, awayScore: 0 }).valid).toBe(false);
    });

    it('rejects a score that contradicts the selected outcome', () => {
      expect(validatePrediction({ outcome: 'draw', homeScore: 2, awayScore: 1 }).valid).toBe(false);
    });

    it('accepts a valid, consistent prediction', () => {
      expect(validatePrediction({ outcome: 'away', homeScore: 0, awayScore: 2 }).valid).toBe(true);
    });
  });
});

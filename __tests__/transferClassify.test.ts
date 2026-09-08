import { classify } from '../src/providers/transferClassify';

describe('classify', () => {
  it('flags an obvious transfer headline with high confidence', () => {
    const r = classify('Arsenal complete move for striker, here we go', 'Personal terms agreed, £60m fee');
    expect(r.category).toBe('transfer');
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it('keeps match coverage as general even if it mentions a signing', () => {
    const r = classify('Player ratings: new signing struggles as Chelsea beat Fulham', 'Match report and reaction');
    expect(r.category).toBe('general');
  });

  it('boosts items that came from a dedicated transfer feed', () => {
    const plain = classify('Defender linked with a move', '', 'general');
    const boosted = classify('Defender linked with a move', '', 'transfer');
    expect(boosted.confidence).toBeGreaterThanOrEqual(plain.confidence);
    expect(boosted.category).toBe('transfer');
  });

  it('always returns a confidence within [0, 1]', () => {
    for (const t of ['x', 'transfer transfer transfer signs signed fee bid here we go done deal', 'match report vs preview']) {
      const r = classify(t, t);
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });
});

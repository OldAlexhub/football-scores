import type { NewsCategory } from '../types/domain';

export type FeedKind = 'general' | 'transfer';

/** Phrases that push a headline towards "transfer news". */
const POSITIVE: string[] = [
  'transfer', 'signs', 'signing', 'signed', 'sign for', 'joins', 'joined',
  'loan', 'medical', 'fee', '£', '€', '$', 'bid', 'agree deal', 'agrees deal',
  'agreed deal', 'personal terms', 'done deal', 'here we go', 'unveiled',
  'completes move', 'complete move', 'release clause', 'buy-back', 'swap deal',
  'new contract', 'new deal', 'contract extension', 'extends contract', 'released',
  'free agent', 'snapped up', 'capture', 'linked with', 'linked to', 'closing in',
  'price tag', 'transfer target', 'wants to sign', 'move to', 'switch to',
  'set to join', 'in talks', 'wantaway', 'gossip', 'rumour', 'rumor',
];

/** Phrases that mark a headline as match coverage, not transfers. */
const NEGATIVE: string[] = [
  'match report', 'player ratings', 'as it happened', 'preview', 'live:',
  ' vs ', ' v ', 'kick-off', 'full-time', 'half-time', 'hat-trick', 'hat trick',
  'injury blow', 'press conference', 'pre-match', 'tactical', 'analysis:',
  'what we learned', 'talking points', 'starting xi', 'line-ups', 'lineups',
  'highlights', 'reaction', 'verdict', 'wins', 'beat', 'draw with', 'defeat',
];

const THRESHOLD = 3;
const SPREAD = 6;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function countHits(haystack: string, needles: string[]): number {
  let hits = 0;
  for (const needle of needles) {
    if (haystack.includes(needle)) hits += 1;
  }
  return hits;
}

export interface ClassifyResult {
  category: NewsCategory;
  confidence: number;
}

/** Score a headline as transfer vs general news, title-weighted. */
export function classify(title: string, snippet: string, feedKind: FeedKind = 'general'): ClassifyResult {
  const titleText = ` ${(title ?? '').toLowerCase()} `;
  const snippetText = ` ${(snippet ?? '').toLowerCase()} `;

  let score = 0;
  score += countHits(titleText, POSITIVE) * 3;
  score += countHits(snippetText, POSITIVE) * 1;
  score -= countHits(titleText, NEGATIVE) * 3;
  score -= countHits(snippetText, NEGATIVE) * 1;
  if (feedKind === 'transfer') score += 3;

  const category: NewsCategory = score >= THRESHOLD ? 'transfer' : 'general';
  const confidence = clamp01((score - THRESHOLD) / SPREAD);
  return { category, confidence };
}

import type { NewsArticle } from '../types/domain';

const TRACKING_PARAM = /^(utm_|ns_|at_|ito$|cmp$|fbclid$|gclid$|mc_cid$|mc_eid$|ocid$|smid$|cmpid$)/i;

/** Canonical URL for de-duplication: lowercase host, no tracking params, no hash. */
export function normalizeUrl(rawUrl: string): string {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^(https?:\/\/)([^/?#]+)([^?#]*)(\?[^#]*)?/i);
  if (!match) return trimmed.toLowerCase().replace(/#.*$/, '').replace(/\/+$/, '');
  const host = match[2].toLowerCase().replace(/^www\./, '');
  let path = match[3].replace(/\/+$/, '');
  if (!path) path = '';
  const query = (match[4] ?? '')
    .replace(/^\?/, '')
    .split('&')
    .filter(pair => pair && !TRACKING_PARAM.test(pair.split('=')[0]))
    .sort();
  return `${host}${path}${query.length ? `?${query.join('&')}` : ''}`;
}

/** Loose title key: lowercase, punctuation stripped, whitespace collapsed. */
export function normalizeTitle(title: string): string {
  return (title ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function dedupeKey(article: NewsArticle): string {
  const url = normalizeUrl(article.link);
  return url || `${article.sourceName}|${normalizeTitle(article.title)}`;
}

/**
 * Collapse the same story reported by several outlets. Keeps the first copy
 * seen (callers pass articles already ordered by recency / source priority),
 * but upgrades to a later copy that carries an image when the kept one has none.
 */
export function dedupeArticles(articles: NewsArticle[]): NewsArticle[] {
  const byKey = new Map<string, NewsArticle>();
  for (const article of articles) {
    const key = dedupeKey(article);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, article);
    } else if (!existing.imageUrl && article.imageUrl) {
      byKey.set(key, { ...article, imageUrl: article.imageUrl });
    }
  }
  return [...byKey.values()];
}

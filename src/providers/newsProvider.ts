import { XMLParser } from 'fast-xml-parser';
import { readCache, writeCache } from '../storage/repositories/providerCacheRepo';
import type { NewsArticle, NewsCategory } from '../types/domain';

const FEED_TIMEOUT_MS = 10000;

async function fetchFeedText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`RSS feed request failed with HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Public RSS feeds, fetched as-is from each publisher. Only the headline,
 * a short plain-text snippet, and an outbound link are ever kept — never
 * the full article body. Each feed fails independently: if one publisher's
 * feed is down or its format changes, the others still populate the list.
 */
const NEWS_FEEDS: Array<{ url: string; sourceName: string }> = [
  { url: 'http://feeds.bbci.co.uk/sport/football/rss.xml', sourceName: 'BBC Sport' },
  { url: 'https://www.theguardian.com/football/rss', sourceName: 'The Guardian' },
  { url: 'https://www.skysports.com/rss/11095', sourceName: 'Sky Sports' },
];

const TRANSFER_KEYWORDS = [
  'transfer', 'signs', 'signing', 'signed', 'loan move', 'loan deal', 'medical',
  'undisclosed fee', 'linked with', 'linked to', 'rumour', 'rumor', 'bid for',
  'swoop', 'move to', 'agree deal', 'agrees deal', 'sign for', 'joins',
];

const NEWS_CACHE_KEY = 'news:all';
const NEWS_CACHE_TTL_MS = 45 * 60 * 1000;

function stripHtml(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

function categorize(title: string, snippet: string): NewsCategory {
  const haystack = `${title} ${snippet}`.toLowerCase();
  return TRANSFER_KEYWORDS.some(kw => haystack.includes(kw)) ? 'transfer' : 'general';
}

function extractImageUrl(item: Record<string, any>): string | null {
  const enclosure = item.enclosure;
  if (enclosure?.['@_url'] && String(enclosure['@_type'] ?? '').startsWith('image')) {
    return enclosure['@_url'];
  }
  const mediaContent = item['media:content'];
  if (mediaContent?.['@_url']) return mediaContent['@_url'];
  const mediaThumbnail = item['media:thumbnail'];
  if (mediaThumbnail?.['@_url']) return mediaThumbnail['@_url'];
  return null;
}

function parsePublishedDate(pubDate: unknown): string | null {
  if (typeof pubDate !== 'string') return null;
  const parsed = new Date(pubDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

async function fetchFeed(feed: { url: string; sourceName: string }): Promise<NewsArticle[]> {
  const xml = await fetchFeedText(feed.url);

  const parser = new XMLParser({
    ignoreAttributes: false,
    isArray: name => name === 'item',
  });
  const parsed = parser.parse(xml);
  const items: Array<Record<string, any>> = parsed?.rss?.channel?.item ?? [];

  return items.slice(0, 25).map((item, index) => {
    const title = stripHtml(String(item.title ?? ''));
    const snippet = truncate(stripHtml(String(item.description ?? item['content:encoded'] ?? '')), 220);
    const link = String(item.link ?? '');
    return {
      id: `${feed.sourceName}:${link || index}`,
      title,
      snippet,
      link,
      sourceName: feed.sourceName,
      imageUrl: extractImageUrl(item),
      publishedAtUtc: parsePublishedDate(item.pubDate),
      category: categorize(title, snippet),
    };
  }).filter(article => article.title && article.link);
}

export interface NewsResult {
  articles: NewsArticle[];
  isFromCache: boolean;
  isStale: boolean;
  failedSources: string[];
}

export async function fetchFootballNews(forceRefresh = false): Promise<NewsResult> {
  if (!forceRefresh) {
    const cached = await readCache<NewsArticle[]>(NEWS_CACHE_KEY);
    if (cached && !cached.isStale) {
      return { articles: cached.payload, isFromCache: true, isStale: false, failedSources: [] };
    }
  }

  const failedSources: string[] = [];
  const results = await Promise.all(
    NEWS_FEEDS.map(feed =>
      fetchFeed(feed).catch(() => {
        failedSources.push(feed.sourceName);
        return [] as NewsArticle[];
      }),
    ),
  );
  const combined = results.flat().sort((a, b) => {
    const aTime = a.publishedAtUtc ? new Date(a.publishedAtUtc).getTime() : 0;
    const bTime = b.publishedAtUtc ? new Date(b.publishedAtUtc).getTime() : 0;
    return bTime - aTime;
  });

  if (combined.length > 0) {
    await writeCache(NEWS_CACHE_KEY, 'cached', combined, NEWS_CACHE_TTL_MS);
    return { articles: combined, isFromCache: false, isStale: false, failedSources };
  }

  const cached = await readCache<NewsArticle[]>(NEWS_CACHE_KEY);
  return {
    articles: cached?.payload ?? [],
    isFromCache: true,
    isStale: true,
    failedSources,
  };
}

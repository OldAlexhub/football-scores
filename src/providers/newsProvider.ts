import { XMLParser } from 'fast-xml-parser';
import { newsHttpStorage } from '../storage/mmkvStorage';
import { readCache, writeCache } from '../storage/repositories/providerCacheRepo';
import type { NewsArticle, NewsEntities } from '../types/domain';
import { CACHE_TTL_MS, cacheKeys } from './cacheKeys';
import { dedupeArticles, normalizeTitle } from './newsDedupe';
import { TEAM_ALIASES } from './nameMatch';
import { classify, type FeedKind } from './transferClassify';
import { fetchText, withRetry } from './httpClient';

const FEED_TIMEOUT_MS = 10000;
const MAX_ITEMS_PER_FEED = 40;

interface FeedConfig {
  url: string;
  sourceName: string;
  lang: 'en' | 'ar';
  kind: FeedKind;
  /** Lower = higher priority when de-duplicating identical stories. */
  priority: number;
}

/**
 * Public publisher RSS/Atom feeds. Only headline + short snippet + outbound
 * link are ever kept. Each feed fails independently. URLs and each site's
 * terms should be re-verified before every release; drop any that 403.
 */
const NEWS_FEEDS: FeedConfig[] = [
  { url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', sourceName: 'BBC Sport', lang: 'en', kind: 'general', priority: 1 },
  { url: 'https://feeds.bbci.co.uk/sport/football/gossip/rss.xml', sourceName: 'BBC Gossip', lang: 'en', kind: 'transfer', priority: 4 },
  { url: 'https://www.theguardian.com/football/rss', sourceName: 'The Guardian', lang: 'en', kind: 'general', priority: 2 },
  { url: 'https://www.theguardian.com/football/transfer-window/rss', sourceName: 'Guardian Transfers', lang: 'en', kind: 'transfer', priority: 3 },
  { url: 'https://www.skysports.com/rss/11095', sourceName: 'Sky Sports', lang: 'en', kind: 'general', priority: 2 },
  { url: 'https://www.skysports.com/rss/12040', sourceName: 'Sky Transfer Centre', lang: 'en', kind: 'transfer', priority: 3 },
  { url: 'https://www.espn.com/espn/rss/soccer/news', sourceName: 'ESPN', lang: 'en', kind: 'general', priority: 3 },
  { url: 'https://feeds.bbci.co.uk/arabic/sports/rss.xml', sourceName: 'BBC عربي', lang: 'ar', kind: 'general', priority: 3 },
  { url: 'https://www.yallakora.com/rss', sourceName: 'يلا كورة', lang: 'ar', kind: 'general', priority: 4 },
];

const parser = new XMLParser({
  ignoreAttributes: false,
  isArray: name => ['item', 'entry', 'category', 'media:content'].includes(name),
});

const NAMED_ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
  '&#39;': "'", '&nbsp;': ' ', '&hellip;': '…', '&mdash;': '—', '&ndash;': '–',
  '&pound;': '£', '&euro;': '€', '&rsquo;': '’', '&lsquo;': '‘', '&ldquo;': '“', '&rdquo;': '”',
};

function decodeXmlText(input: string): string {
  return String(input ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&[a-z]+[0-9]*;/gi, entity => NAMED_ENTITIES[entity.toLowerCase()] ?? entity)
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength).trimEnd()}…`;
}

function pickString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && '#text' in (value as any)) return String((value as any)['#text'] ?? '');
  return '';
}

function extractLink(item: Record<string, any>): string {
  if (typeof item.link === 'string') return item.link;
  if (Array.isArray(item.link)) {
    const alt = item.link.find((l: any) => l?.['@_rel'] === 'alternate') ?? item.link[0];
    return alt?.['@_href'] ?? pickString(alt);
  }
  if (item.link?.['@_href']) return item.link['@_href'];
  return pickString(item.link) || pickString(item.guid) || pickString(item.id);
}

function extractImageUrl(item: Record<string, any>): string | null {
  const enclosure = item.enclosure;
  const enclosures = Array.isArray(enclosure) ? enclosure : enclosure ? [enclosure] : [];
  for (const e of enclosures) {
    if (e?.['@_url'] && String(e['@_type'] ?? '').startsWith('image')) return e['@_url'];
  }
  const mediaContent: any[] = ([] as any[]).concat(item['media:content'] ?? item['media:group']?.['media:content'] ?? []);
  const image = mediaContent
    .filter(m => m?.['@_url'] && (!m['@_medium'] || m['@_medium'] === 'image'))
    .sort((a, b) => Number(b['@_width'] ?? 0) - Number(a['@_width'] ?? 0))[0];
  if (image?.['@_url']) return image['@_url'];
  const thumb = item['media:thumbnail'];
  const thumbUrl = Array.isArray(thumb) ? thumb[0]?.['@_url'] : thumb?.['@_url'];
  if (thumbUrl) return thumbUrl;
  if (item.image?.url) return pickString(item.image.url);
  const body = pickString(item['content:encoded']) || pickString(item.content) || pickString(item.description);
  const inlineImg = body.match(/<img[^>]+src=["']([^"']+)["']/i);
  return inlineImg ? inlineImg[1] : null;
}

function parsePublishedDate(item: Record<string, any>): string | null {
  const raw = pickString(item.pubDate) || pickString(item.published) || pickString(item.updated) || pickString(item['dc:date']);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

const TEAM_VOCAB = [...new Set([...Object.keys(TEAM_ALIASES), ...Object.values(TEAM_ALIASES)])]
  .filter(name => name.length >= 4);

function tagEntities(haystack: string): NewsEntities {
  const normalized = ` ${normalizeTitle(haystack)} `;
  const teamKeys = TEAM_VOCAB.filter(team => normalized.includes(` ${team} `));
  return { teamKeys: [...new Set(teamKeys)], playerNames: [] };
}

function mapItem(item: Record<string, any>, feed: FeedConfig): NewsArticle | null {
  const title = decodeXmlText(pickString(item.title));
  const link = String(extractLink(item) ?? '').trim();
  if (!title || !link) return null;
  const snippet = truncate(decodeXmlText(pickString(item.description) || pickString(item.summary) || pickString(item['content:encoded'])), 220);
  const { category, confidence } = classify(title, snippet, feed.kind);
  return {
    id: `${feed.sourceName}:${link}`,
    title,
    snippet,
    link,
    sourceName: feed.sourceName,
    imageUrl: extractImageUrl(item),
    publishedAtUtc: parsePublishedDate(item),
    category,
    transferConfidence: category === 'transfer' ? confidence : undefined,
    guid: link,
    entities: tagEntities(`${title} ${snippet}`),
  };
}

function conditionalHeaders(url: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const etag = newsHttpStorage.getString(`etag:${url}`);
  const lastModified = newsHttpStorage.getString(`lm:${url}`);
  if (etag) headers['If-None-Match'] = etag;
  if (lastModified) headers['If-Modified-Since'] = lastModified;
  return headers;
}

async function fetchFeed(feed: FeedConfig, cachedBySource: Map<string, NewsArticle[]>): Promise<NewsArticle[]> {
  const response = await withRetry(() => fetchText('cached', feed.url, {
    headers: conditionalHeaders(feed.url),
    timeoutMs: FEED_TIMEOUT_MS,
  }));

  if (response.status === 304) {
    return cachedBySource.get(feed.sourceName) ?? [];
  }
  if (response.etag) newsHttpStorage.set(`etag:${feed.url}`, response.etag);
  if (response.lastModified) newsHttpStorage.set(`lm:${feed.url}`, response.lastModified);

  const parsed = parser.parse(response.text);
  const items: Array<Record<string, any>> = parsed?.rss?.channel?.item ?? parsed?.feed?.entry ?? [];
  return items
    .slice(0, MAX_ITEMS_PER_FEED)
    .map(item => mapItem(item, feed))
    .filter((article): article is NewsArticle => !!article);
}

export interface NewsResult {
  articles: NewsArticle[];
  isFromCache: boolean;
  isStale: boolean;
  failedSources: string[];
}

export interface FetchNewsOptions {
  forceRefresh?: boolean;
  /** Boost Arabic sources to the top when the app is in Arabic. */
  language?: 'en' | 'ar';
}

export async function fetchFootballNews(options: FetchNewsOptions = {}): Promise<NewsResult> {
  const cacheKey = cacheKeys.news();
  const cached = await readCache<NewsArticle[]>(cacheKey).catch(() => null);

  if (!options.forceRefresh && cached && !cached.isStale) {
    return { articles: orderArticles(cached.payload, options.language), isFromCache: true, isStale: false, failedSources: [] };
  }

  const cachedBySource = new Map<string, NewsArticle[]>();
  for (const article of cached?.payload ?? []) {
    const list = cachedBySource.get(article.sourceName) ?? [];
    list.push(article);
    cachedBySource.set(article.sourceName, list);
  }

  const failedSources: string[] = [];
  const results = await Promise.all(
    NEWS_FEEDS.map(feed =>
      fetchFeed(feed, cachedBySource).catch(() => {
        failedSources.push(feed.sourceName);
        return [] as NewsArticle[];
      }),
    ),
  );

  const combined = dedupeArticles(results.flat()).sort(byRecency);

  if (combined.length > 0) {
    await writeCache(cacheKey, 'cached', combined, CACHE_TTL_MS.news).catch(() => undefined);
    return { articles: orderArticles(combined, options.language), isFromCache: false, isStale: false, failedSources };
  }

  return {
    articles: orderArticles(cached?.payload ?? [], options.language),
    isFromCache: true,
    isStale: true,
    failedSources,
  };
}

function byRecency(a: NewsArticle, b: NewsArticle): number {
  const at = a.publishedAtUtc ? new Date(a.publishedAtUtc).getTime() : 0;
  const bt = b.publishedAtUtc ? new Date(b.publishedAtUtc).getTime() : 0;
  return bt - at;
}

const ARABIC_SOURCES = new Set(NEWS_FEEDS.filter(f => f.lang === 'ar').map(f => f.sourceName));

function orderArticles(articles: NewsArticle[], language?: 'en' | 'ar'): NewsArticle[] {
  if (language !== 'ar') return articles;
  const arabic = articles.filter(a => ARABIC_SOURCES.has(a.sourceName));
  const rest = articles.filter(a => !ARABIC_SOURCES.has(a.sourceName));
  return [...arabic, ...rest];
}

/** True when a headline plausibly refers to `playerName` (full name or a long surname). */
export function articleMentions(article: NewsArticle, playerName: string): boolean {
  const name = normalizeTitle(playerName);
  if (!name) return false;
  const haystack = ` ${normalizeTitle(`${article.title} ${article.snippet}`)} `;
  if (haystack.includes(` ${name} `)) return true;
  const surname = name.split(' ').pop() ?? '';
  return surname.length >= 5 && haystack.includes(` ${surname} `);
}

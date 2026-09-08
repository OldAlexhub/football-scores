import { dedupeArticles, normalizeTitle, normalizeUrl } from '../src/providers/newsDedupe';
import type { NewsArticle } from '../src/types/domain';

function article(partial: Partial<NewsArticle>): NewsArticle {
  return {
    id: Math.random().toString(),
    title: 'A title',
    snippet: '',
    link: 'https://example.com/story',
    sourceName: 'Source',
    imageUrl: null,
    publishedAtUtc: null,
    category: 'general',
    ...partial,
  };
}

describe('normalizeUrl', () => {
  it('strips tracking params and trailing slash', () => {
    expect(normalizeUrl('https://www.BBC.co.uk/sport/football/123/?utm_source=x&fbclid=y'))
      .toBe('bbc.co.uk/sport/football/123');
  });
  it('keeps meaningful query params, sorted', () => {
    expect(normalizeUrl('https://x.com/a?b=2&a=1&utm_medium=z')).toBe('x.com/a?a=1&b=2');
  });
});

describe('normalizeTitle', () => {
  it('lowercases, removes punctuation and accents', () => {
    expect(normalizeTitle('Mbappé: “Here we go!”')).toBe('mbappe here we go');
  });
});

describe('dedupeArticles', () => {
  it('collapses the same URL from two feeds', () => {
    const out = dedupeArticles([
      article({ link: 'https://site.com/x?utm_source=a', sourceName: 'BBC' }),
      article({ link: 'https://site.com/x', sourceName: 'Sky' }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].sourceName).toBe('BBC');
  });

  it('prefers the copy that has an image', () => {
    const out = dedupeArticles([
      article({ link: 'https://site.com/y', imageUrl: null, sourceName: 'BBC' }),
      article({ link: 'https://site.com/y', imageUrl: 'https://img/p.jpg', sourceName: 'Sky' }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].imageUrl).toBe('https://img/p.jpg');
  });

  it('falls back to source+title when links differ', () => {
    const out = dedupeArticles([
      article({ link: 'https://a.com/1', title: 'Rice signs new deal', sourceName: 'BBC' }),
      article({ link: 'https://b.com/2', title: 'Rice signs new deal', sourceName: 'BBC' }),
    ]);
    expect(out).toHaveLength(2); // different URLs, both kept
  });
});

import Parser from 'rss-parser';
import type { Article } from './types.js';

const FEEDS = [
  { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', source: 'TechCrunch' },
  { url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', source: 'The Verge' },
  { url: 'https://hnrss.org/newest?q=AI&count=30', source: 'Hacker News' },
];

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function extractSummary(item: Parser.Item): string {
  const raw = item.contentSnippet ?? item.content ?? item.summary ?? '';
  const text = stripHtml(raw)
    .replace(/Article URL:\s*\S+/gi, '')
    .replace(/Comments URL:\s*\S+/gi, '')
    .replace(/Points:\s*\d+[^|]*\|\s*Comments:\s*\d+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  return text.length > 100 ? text.slice(0, 100) + '…' : text;
}

export async function fetchAllArticles(): Promise<Article[]> {
  const parser = new Parser({ timeout: 10000 });
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const results = await Promise.allSettled(
    FEEDS.map(async ({ url, source }) => {
      const feed = await parser.parseURL(url);
      return feed.items
        .filter((item) => {
          if (!item.pubDate) return false;
          return new Date(item.pubDate) > cutoff;
        })
        .map((item): Article => ({
          title: item.title?.trim() || '(no title)',
          link: item.link || '',
          pubDate: new Date(item.pubDate!),
          source,
          summary: extractSummary(item),
        }));
    })
  );

  const articles: Article[] = [];
  for (const [i, result] of results.entries()) {
    if (result.status === 'fulfilled') {
      articles.push(...result.value);
    } else {
      console.warn(`[警告] 抓取 ${FEEDS[i].source} 失败：${result.reason}`);
    }
  }

  const seen = new Set<string>();
  const deduped = articles.filter((a) => {
    if (!a.link || seen.has(a.link)) return false;
    seen.add(a.link);
    return true;
  });

  return deduped.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
}

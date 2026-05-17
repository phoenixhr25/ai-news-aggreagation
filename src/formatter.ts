import * as fs from 'fs';
import * as path from 'path';
import type { Article } from './types.js';
import type { Pick } from './curator.js';

function toDateStr(date: Date): string {
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\//g, '-');
}

function toTimeStr(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function generateReport(articles: Article[], now: Date, picks: Pick[] = []): string {
  const dateStr = toDateStr(now);
  const sources = [...new Set(articles.map((a) => a.source))];

  const lines: string[] = [
    `# AI 新闻日报 · ${dateStr}`,
    '',
    `> 共收录 **${articles.length}** 篇文章，来自 **${sources.length}** 个源：${sources.join(' · ')}`,
    '',
  ];

  if (picks.length > 0) {
    lines.push('## 今日精选', '');
    for (const pick of picks) {
      lines.push(`**[${pick.article.title}](${pick.article.link})**`);
      lines.push(`> ${pick.reason}`);
      lines.push(`来源：${pick.article.source} · ${toTimeStr(pick.article.pubDate)}`);
      lines.push('');
    }
    lines.push('---', '', '## 全部文章', '');
  } else {
    lines.push('---', '');
  }

  for (const article of articles) {
    lines.push(`### ${toTimeStr(article.pubDate)}　${article.source}`);
    lines.push('');
    lines.push(`**[${article.title}](${article.link})**`);
    lines.push('');
    if (article.summary) {
      lines.push(article.summary);
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

export function writeReport(content: string, now: Date): string {
  const outputDir = path.resolve('output');
  fs.mkdirSync(outputDir, { recursive: true });

  const filename = `${toDateStr(now)}.md`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, content, 'utf-8');
  return filepath;
}

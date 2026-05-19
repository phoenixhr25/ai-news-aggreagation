import * as fs from 'fs';
import * as path from 'path';
import type { Article } from './types.js';
import type { Pick } from './curator.js';

function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

function toWeekStr(date: Date): string {
  const { year, week } = getISOWeek(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function toDateStr(date: Date): string {
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\//g, '-');
}

function toTimeStr(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function generateReport(articles: Article[], now: Date, picks: Pick[] = []): string {
  const weekStr = toWeekStr(now);
  const sources = [...new Set(articles.map((a) => a.source))];

  const lines: string[] = [
    `# AI零售情报周报 · ${weekStr}`,
    '',
    `> 共收录 **${articles.length}** 篇文章，来自 **${sources.length}** 个源：${sources.join(' · ')}`,
    '',
  ];

  if (picks.length > 0) {
    lines.push('## 本周精选', '');
    for (const pick of picks) {
      if (pick.category) lines.push(`**${pick.category}**`);
      if (pick.chineseTitle) lines.push(`${pick.chineseTitle}`);
      lines.push(`**[${pick.article.title}](${pick.article.link})**`);
      if (pick.reason) lines.push(`> ${pick.reason}`);
      if (pick.insight) lines.push(`> ${pick.insight}`);
      lines.push(`来源：${pick.article.source} · ${toDateStr(pick.article.pubDate)} ${toTimeStr(pick.article.pubDate)}`);
      lines.push('');
    }
    lines.push('---', '', '## 全部文章', '');
  } else {
    lines.push('---', '');
  }

  for (const article of articles) {
    lines.push(`### ${toDateStr(article.pubDate)} ${toTimeStr(article.pubDate)}　${article.source}`);
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

  const filename = `${toWeekStr(now)}.md`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, content, 'utf-8');
  return filepath;
}

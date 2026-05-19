import { Client } from '@notionhq/client';
import { markdownToBlocks } from '@tryfabric/martian';
import type { Article } from './types.js';
import type { Pick } from './curator.js';

const WEEKLY_REPORT_PARENT_ID = '36461f64-7b06-8183-be37-f93d5a9e3b77';
const SIGNAL_DATABASE_ID = '36561f64-7b06-801f-96d3-cb2cd9958206';

function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

function weekLabel(date: Date): string {
  const { year, week } = getISOWeek(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function h2(text: string) {
  return {
    object: 'block' as const,
    type: 'heading_2' as const,
    heading_2: { rich_text: [{ type: 'text' as const, text: { content: text } }] },
  };
}

function para(text: string) {
  return {
    object: 'block' as const,
    type: 'paragraph' as const,
    paragraph: { rich_text: [{ type: 'text' as const, text: { content: text } }] },
  };
}

function linkedPara(text: string, url: string) {
  return {
    object: 'block' as const,
    type: 'paragraph' as const,
    paragraph: {
      rich_text: [{ type: 'text' as const, text: { content: text, link: { url } } }],
    },
  };
}

function divider() {
  return { object: 'block' as const, type: 'divider' as const, divider: {} };
}

async function appendChunks(notion: Client, blockId: string, blocks: object[]) {
  for (let i = 0; i < blocks.length; i += 100) {
    await notion.blocks.children.append({
      block_id: blockId,
      children: blocks.slice(i, i + 100) as Parameters<typeof notion.blocks.children.append>[0]['children'],
    });
  }
}

// 目标一：AI情报周报（技术前沿 + 科普选题 + 全部文章）
export async function syncWeeklyReport(
  picks: Pick[],
  articles: Article[],
  now: Date
): Promise<void> {
  const token = process.env.NOTION_TOKEN;
  if (!token) return;

  const notion = new Client({ auth: token });
  const label = weekLabel(now);
  const title = `AI情报周报 · ${label}`;

  const reportPicks = picks.filter(
    (p) => p.category === '技术前沿' || p.category === '科普选题'
  );

  const lines: string[] = [
    `> 共收录 **${articles.length}** 篇文章`,
    '',
  ];

  if (reportPicks.length > 0) {
    lines.push('## 本周精选', '');
    for (const pick of reportPicks) {
      lines.push(`**${pick.category}**`);
      lines.push(`**[${pick.article.title}](${pick.article.link})**`);
      lines.push(`> ${pick.reason}`);
      lines.push(`来源：${pick.article.source}`);
      lines.push('');
    }
    lines.push('---', '', '## 全部文章', '');
  }

  for (const article of articles) {
    lines.push(`### [${article.title}](${article.link})`);
    lines.push(article.source);
    if (article.summary) lines.push('', article.summary);
    lines.push('');
  }

  const blocks = markdownToBlocks(lines.join('\n'));

  const page = await notion.pages.create({
    parent: { page_id: WEEKLY_REPORT_PARENT_ID },
    properties: {
      title: { title: [{ text: { content: title } }] },
    },
    children: blocks.slice(0, 100) as Parameters<typeof notion.pages.create>[0]['children'],
  });

  if (blocks.length > 100) {
    await appendChunks(notion, page.id, blocks.slice(100));
  }

  console.log(`✓ 已同步到 Notion 周报：${title}`);
}

// 目标二：本周精选信号数据库（行业动态 + 消费者行为）
export async function writeSignalEntries(picks: Pick[], now: Date): Promise<void> {
  const token = process.env.NOTION_TOKEN;
  if (!token) return;

  const notion = new Client({ auth: token });
  const label = weekLabel(now);
  const weeklyReportRef = `AI情报周报 · ${label}`;

  const businessPicks = picks.filter(
    (p) => p.category === '行业动态' || p.category === '消费者行为'
  );

  for (const pick of businessPicks) {
    const pubDate = toISODate(pick.article.pubDate);
    const titleText = pick.chineseTitle || pick.article.title;
    const summary = pick.article.summary ? pick.article.summary.slice(0, 150) : '';

    const children = [
      h2('原标题'),
      linkedPara(pick.article.title, pick.article.link),
      divider(),
      h2('📌 核心信号'),
      para(pick.reason ?? ''),
      divider(),
      h2('🎯 对中国品牌的意义'),
      para(pick.insight ?? ''),
      divider(),
      h2('🔗 来源'),
      para(`${pick.article.source} · ${pubDate}`),
      divider(),
      h2('📄 原文摘要'),
      para(summary),
    ];

    await notion.pages.create({
      parent: { database_id: SIGNAL_DATABASE_ID },
      properties: {
        标题: { title: [{ text: { content: titleText } }] },
        方向: { select: { name: pick.category } },
        核心信号: { rich_text: [{ text: { content: pick.reason ?? '' } }] },
        来源: { rich_text: [{ text: { content: pick.article.source } }] },
        原文链接: { url: pick.article.link },
        发布日期: { date: { start: pubDate } },
        来源周报: { rich_text: [{ text: { content: weeklyReportRef } }] },
      },
      children: children as Parameters<typeof notion.pages.create>[0]['children'],
    });

    console.log(`✓ 已写入信号数据库：[${pick.category}] ${titleText}`);
  }
}

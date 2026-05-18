import { Client } from '@notionhq/client';
import { markdownToBlocks } from '@tryfabric/martian';

function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

export async function syncToNotion(content: string, now: Date): Promise<void> {
  const token = process.env.NOTION_TOKEN;
  const pageId = process.env.NOTION_PAGE_ID;
  if (!token || !pageId) return;

  const { year, week } = getISOWeek(now);
  const title = `AI零售情报周报 · ${year}-W${String(week).padStart(2, '0')}`;

  const notion = new Client({ auth: token });

  const blocks = markdownToBlocks(content) as Parameters<typeof notion.pages.create>[0] extends { children?: infer C } ? C : never[];

  const chunkSize = 100;
  const firstChunk = blocks.slice(0, chunkSize);

  const page = await notion.pages.create({
    parent: { page_id: pageId },
    properties: {
      title: { title: [{ text: { content: title } }] },
    },
    children: firstChunk,
  });

  for (let i = chunkSize; i < blocks.length; i += chunkSize) {
    await notion.blocks.children.append({
      block_id: page.id,
      children: blocks.slice(i, i + chunkSize),
    });
  }

  console.log(`✓ 已同步到 Notion：${title}`);
}

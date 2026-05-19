import 'dotenv/config';
import cron from 'node-cron';
import { fetchAllArticles } from './fetcher.js';
import { generateReport, writeReport } from './formatter.js';
import { pickTopArticles } from './curator.js';
import { syncWeeklyReport, writeSignalEntries } from './notion.js';

async function run() {
  console.log(`[${new Date().toLocaleString('zh-CN')}] 正在抓取过去 7 天的 AI 零售情报...`);

  const articles = await fetchAllArticles();

  if (articles.length === 0) {
    console.log('过去 7 天内没有找到任何文章。');
    return;
  }

  console.log(`✓ 已收录 ${articles.length} 篇文章，正在生成本周精选...`);
  const picks = await pickTopArticles(articles);

  const now = new Date();
  const report = generateReport(articles, now, picks);
  const filepath = writeReport(report, now);

  if (picks.length > 0) {
    console.log(`✓ 本周精选 ${picks.length} 篇`);
  }
  console.log(`✓ 周报已写入：${filepath}`);

  await syncWeeklyReport(picks, articles, now).catch((e) =>
    console.warn('[警告] Notion 周报同步失败：', e.message)
  );
  await writeSignalEntries(picks, now).catch((e) =>
    console.warn('[警告] Notion 信号数据库写入失败：', e.message)
  );
}

const isCron = process.argv.includes('--cron');

if (isCron) {
  console.log('定时模式已启动，每周一 08:00 自动运行（Ctrl+C 退出）');
  run().catch(console.error);
  cron.schedule('0 8 * * 1', () => {
    run().catch(console.error);
  });
} else {
  run().catch((err) => {
    console.error('运行出错：', err);
    process.exit(1);
  });
}

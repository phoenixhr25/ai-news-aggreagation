import cron from 'node-cron';
import { fetchAllArticles } from './fetcher.js';
import { generateReport, writeReport } from './formatter.js';

async function run() {
  console.log(`[${new Date().toLocaleString('zh-CN')}] 正在抓取过去 24 小时的 AI 新闻...`);

  const articles = await fetchAllArticles();

  if (articles.length === 0) {
    console.log('过去 24 小时内没有找到任何文章。');
    return;
  }

  const now = new Date();
  const report = generateReport(articles, now);
  const filepath = writeReport(report, now);

  console.log(`✓ 已收录 ${articles.length} 篇文章`);
  console.log(`✓ 日报已写入：${filepath}`);
}

const isCron = process.argv.includes('--cron');

if (isCron) {
  console.log('定时模式已启动，每天 08:00 自动运行（Ctrl+C 退出）');
  // 启动时立即运行一次
  run().catch(console.error);
  // 之后每天 08:00 运行
  cron.schedule('0 8 * * *', () => {
    run().catch(console.error);
  });
} else {
  run().catch((err) => {
    console.error('运行出错：', err);
    process.exit(1);
  });
}

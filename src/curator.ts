import OpenAI from 'openai';
import type { Article } from './types.js';

export interface Pick {
  article: Article;
  category: string;
  reason: string;
}

export async function pickTopArticles(articles: Article[], n = 3): Promise<Pick[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.warn('[警告] 未找到 DEEPSEEK_API_KEY，跳过今日精选');
    return [];
  }

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.deepseek.com',
  });

  const list = articles
    .map((a, i) => `${i}. [${a.source}] ${a.title}`)
    .join('\n');

  const prompt = `你是一个 AI 新闻编辑。以下是今天的 AI 新闻列表：

${list}

从中按以下三个方向各挑一篇，每个方向选最符合的那篇：
1. 技术前沿：技术突破、新模型、新工具，对 AI 从业者有实际参考价值
2. 科普选题：适合面向普通人解读，有讨论空间，可作为内容创作素材
3. 行业动态：大模型公司战略、AI 政策法规、资本市场或就业影响

只返回 JSON 数组，格式如下，不要其他文字：
[
  { "index": 0, "category": "技术前沿", "reason": "一句话说明为什么值得关注" },
  { "index": 1, "category": "科普选题", "reason": "一句话说明为什么值得关注" },
  { "index": 2, "category": "行业动态", "reason": "一句话说明为什么值得关注" }
]`;

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const raw = response.choices[0].message.content ?? '{}';

  let parsed: { index: number; category: string; reason: string }[];
  try {
    const obj = JSON.parse(raw);
    parsed = Array.isArray(obj) ? obj : (obj.picks ?? obj.results ?? Object.values(obj)[0]);
  } catch {
    console.warn('[警告] DeepSeek 返回格式解析失败，跳过今日精选');
    return [];
  }

  return parsed
    .filter((p) => typeof p.index === 'number' && articles[p.index])
    .slice(0, n)
    .map((p) => ({ article: articles[p.index], category: p.category ?? '', reason: p.reason }));
}

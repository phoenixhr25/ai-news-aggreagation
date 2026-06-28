import OpenAI from 'openai';
import type { Article } from './types.js';

export interface Pick {
  article: Article;
  category: string;
  reason: string;
  chineseTitle?: string;
  insight?: string;
}

export async function pickTopArticles(articles: Article[], n = 4): Promise<Pick[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.warn('[警告] 未找到 DEEPSEEK_API_KEY，跳过本周精选');
    return [];
  }

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.deepseek.com',
    fetch: globalThis.fetch,
  });

  const list = articles
    .map((a, i) => `${i}. [${a.source}] ${a.title}`)
    .join('\n');

  const prompt = `你是一个 AI 与零售行业的内容编辑。以下是本周的文章列表：

${list}

从中按以下四个方向各挑一篇，每个方向选最符合的那篇：

1. 技术前沿
   - 优先：涉及具体 AI/LLM 概念、机制、架构、新模型发布
   - 优先：有"它是如何工作的"可拆解的内容
   - 降权：纯产品发布公告、无机制可挖的工具推介

2. 科普选题
   - 优先：AI/经济现象有反直觉的"机制层"可挖
   - 优先：涉及平台逻辑、决策行为、AI 社会影响
   - 标准：读完后能形成一个判断句式的结论（定义型或反转型）
   - 降权：纯现象描述、没有结构性解读空间的新闻

3. 行业动态
   - 优先：具体公司动作、政策变化、资本市场信号
   - 优先：大模型公司战略、AI 监管、裁员/融资/并购
   - 降权：活动预告、产品更新日志类内容

4. 消费者行为
   - 优先：美国消费者场景溢价、情绪消费、身份认同相关
   - 优先：DTC 品牌动态、零售渠道结构变化、Amazon 行为信号
   - 优先：实体零售 vs 电商消费习惯对比、新兴品类需求信号
   - 降权：泛泛的"AI 改变零售"、与消费行为无关的纯技术文章

返回规则：
- reason 必须说明"为什么这篇适合这个方向"，不只是复述标题
- 行业动态和消费者行为额外提供 chineseTitle（准确的中文标题翻译）和 insight（从中国品牌进入北美零售渠道的视角，用100字解读这篇文章对供应商或品牌主的实际意义，语言精练，直接给结论，不废话）
- 技术前沿和科普选题不需要 chineseTitle 和 insight 字段

只返回 JSON 数组，不要其他文字：
[
  { "index": 0, "category": "技术前沿", "reason": "..." },
  { "index": 1, "category": "科普选题", "reason": "..." },
  { "index": 2, "category": "行业动态", "reason": "...", "chineseTitle": "...", "insight": "..." },
  { "index": 3, "category": "消费者行为", "reason": "...", "chineseTitle": "...", "insight": "..." }
]`;

  const response = await (async () => {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await client.chat.completions.create({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        });
      } catch (err: unknown) {
        if (attempt === maxAttempts) {
          console.warn('[警告] DeepSeek 三次请求均失败，跳过精选，仅输出文章列表', (err as Error).message);
          return null;
        }
        const waitMs = attempt * 5000;
        console.warn(`[警告] DeepSeek 请求失败（第 ${attempt} 次），${waitMs / 1000}s 后重试...`, (err as Error).message);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
    return null;
  })();

  if (!response) return [];

  const raw = response.choices[0].message.content ?? '{}';

  let parsed: { index: number; category: string; reason: string; chineseTitle?: string; insight?: string }[];
  try {
    const obj = JSON.parse(raw);
    parsed = Array.isArray(obj) ? obj : (obj.picks ?? obj.results ?? Object.values(obj)[0]);
  } catch {
    console.warn('[警告] DeepSeek 返回格式解析失败，跳过本周精选');
    return [];
  }

  return parsed
    .filter((p) => typeof p.index === 'number' && articles[p.index])
    .slice(0, n)
    .map((p) => ({
      article: articles[p.index],
      category: p.category ?? '',
      reason: p.reason,
      chineseTitle: p.chineseTitle,
      insight: p.insight,
    }));
}

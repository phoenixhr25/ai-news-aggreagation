# AI News CLI

自动抓取过去 24 小时的 AI 新闻，用 DeepSeek 挑出今日精选，生成 Markdown 日报。

## 数据源

| 来源 | 内容 |
|---|---|
| TechCrunch AI | AI 行业报道 |
| The Verge AI | 科技 + AI 新闻 |
| Hacker News | 社区精选（关键词：AI，前30条） |

## 快速开始

```bash
# 安装依赖
npm install

# 创建 .env 文件
echo "DEEPSEEK_API_KEY=your_key_here" > .env

# 立即运行一次
npx tsx src/index.ts

# 定时模式（每天 08:00 自动运行）
npx tsx src/index.ts --cron
```

日报输出到 `output/YYYY-MM-DD.md`，重复运行当天文件会覆盖。

## 今日精选

每天从三个方向各挑一篇，由 DeepSeek 根据标题自动判断：

| 分类 | 筛选标准 |
|---|---|
| 技术前沿 | 技术突破、新模型、新工具，对 AI 从业者有实际参考价值 |
| 科普选题 | 适合面向普通人解读，有讨论空间，可作为内容创作素材 |
| 行业动态 | 大模型公司战略、AI 政策法规、资本市场或就业影响 |

## 输出格式

```markdown
# AI 新闻日报 · 2026-05-17

> 共收录 35 篇文章，来自 3 个源：Hacker News · The Verge · TechCrunch

## 今日精选

**技术前沿**
**[文章标题](https://...)**
> 一句话说明为什么值得关注
来源：Hacker News · 10:32

**科普选题**
**[文章标题](https://...)**
> 一句话说明为什么值得关注
来源：The Verge · 09:15

**行业动态**
**[文章标题](https://...)**
> 一句话说明为什么值得关注
来源：TechCrunch · 08:47

---

## 全部文章

### 10:32　TechCrunch

**[文章标题](https://...)**

文章摘要前100字…

---
```

## GitHub Actions 自动运行

每天 00:00 UTC（08:00 CST）自动触发，结果提交到仓库 `output/` 目录。

需在仓库 **Settings → Secrets and variables → Actions → Repository secrets** 添加：

| Secret | 说明 |
|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek API key，用于生成今日精选 |

未配置 key 时跳过今日精选，仍正常生成全部文章列表。

## 项目结构

```
src/
├── index.ts      # 入口，支持 --cron 参数
├── fetcher.ts    # RSS 抓取、24h 过滤、去重、摘要提取
├── curator.ts    # DeepSeek 今日精选
├── formatter.ts  # Markdown 生成与文件写入
└── types.ts      # Article 类型定义
output/           # 生成的日报（由 GitHub Actions 提交）
```

## 技术栈

- TypeScript + [tsx](https://github.com/privatenumber/tsx)（无需编译）
- [rss-parser](https://github.com/rbren/rss-parser) — RSS 解析
- [node-cron](https://github.com/node-cron/node-cron) — 定时调度
- [openai](https://github.com/openai/openai-node) — DeepSeek API（OpenAI 兼容格式）

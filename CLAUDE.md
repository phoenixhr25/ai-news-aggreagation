# CLAUDE.md — ai-news-cli

## 项目简介

每周自动抓取北美 AI 与零售行业情报，用 DeepSeek 按四个方向挑选精华，生成 Markdown 周报并同步到 Notion。面向中国品牌进入北美零售市场的情报服务。

## 技术栈

- TypeScript + [tsx](https://github.com/privatenumber/tsx)（无需编译，直接运行）
- `rss-parser` — RSS 解析
- `openai` — DeepSeek API（OpenAI 兼容格式）
- `node-cron` — 定时调度
- `@notionhq/client` — Notion API
- `@tryfabric/martian` — Markdown → Notion blocks 转换

## 文件结构

```
src/
├── index.ts      # 入口，支持 --cron 参数
├── fetcher.ts    # RSS 抓取、7天过滤、AI关键词过滤、去重
├── curator.ts    # DeepSeek 四方向精选
├── formatter.ts  # Markdown 生成与文件写入
├── notion.ts     # Notion 周报子页面 + 信号数据库写入
└── types.ts      # Article 类型定义
output/           # 生成的周报（由 GitHub Actions 提交）
```

## 数据源

| 来源 | 类型 | 过滤 |
|---|---|---|
| TechCrunch AI | AI 行业报道 | 无 |
| The Verge AI | 科技 + AI 新闻 | 无 |
| Hacker News | 社区精选（关键词：AI，前30条） | 无 |
| Retail Dive | 零售行业新闻 | AI 关键词过滤 |
| Modern Retail | 新零售媒体 | AI 关键词过滤 |
| Home Furnishings News | 家居零售行业 | AI 关键词过滤 |

加源：在 `fetcher.ts` 的 `FEEDS` 数组里追加，`retailFilter: true` 表示需要 AI 关键词过滤。

## DeepSeek 精选逻辑（四个方向）

在 `curator.ts` 的 prompt 中定义，每个方向各选 1 篇：

| 方向 | 选题标准 |
|---|---|
| **技术前沿** | AI 机制、新模型发布、有"如何工作"可拆解的工程内容 |
| **科普选题** | 有反直觉机制可挖的 AI/经济现象，读完能形成判断性结论 |
| **行业动态** | 大模型公司战略、AI 监管政策、裁员/融资/并购资本信号 |
| **消费者行为** | 北美零售趋势、DTC 品牌动态、消费习惯变化、Amazon 行为信号 |

- **技术前沿**和**科普选题**：只输出 `reason`
- **行业动态**和**消费者行为**：额外输出 `chineseTitle`（中文标题）和 `insight`（100字中国品牌视角解读）

## Notion 写入目标

### 目标一：AI情报周报（子页面）

- 父页面 ID：`36461f64-7b06-8183-be37-f93d5a9e3b77`
- 每周新建一个子页面，标题格式：`AI情报周报 · 2026-W21`
- 内容：技术前沿 + 科普选题精选 + 全部文章列表

### 目标二：本周精选信号（数据库）

- 数据库页面 ID：`36561f64-7b06-801f-96d3-cb2cd9958206`
- 每次写入行业动态 + 消费者行为各 1 条
- 每条包含：中文标题、核心信号、对中国品牌的意义（insight）、原文摘要

数据库字段：`标题`（Title）、`方向`（Select）、`核心信号`、`来源`、`原文链接`、`发布日期`、`来源周报`

两个 Notion 目标的 ID 均硬编码在 `notion.ts` 顶部，修改时直接替换常量即可。Integration 需在对应页面/数据库的 **Connections** 里单独授权。

## GitHub Actions

文件：`.github/workflows/daily.yml`

- 每周一 00:00 UTC（08:00 CST）自动触发
- 运行 `npx tsx src/index.ts`，将 `output/` 目录提交到仓库

需在仓库 **Settings → Secrets → Actions** 配置：

| Secret | 用途 |
|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek 精选 API |
| `NOTION_TOKEN` | Notion Integration token |

## 常见修改场景

**加 RSS 源**：在 `fetcher.ts` 的 `FEEDS` 数组里添加一条，`retailFilter: true` 表示需要 AI 关键词过滤。

**改精选方向或标准**：修改 `curator.ts` 里的 prompt 文字，返回格式不变。

**调定时时间**：修改 `.github/workflows/daily.yml` 里的 `cron` 表达式（UTC 时间）。

**换 Notion 目标**：修改 `notion.ts` 顶部的 `WEEKLY_REPORT_PARENT_ID` 或 `SIGNAL_DATABASE_ID`，同时在新页面/数据库的 Connections 里添加 integration 授权。

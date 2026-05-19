# AI 零售情报周报 CLI

自动抓取过去 7 天的 AI 与零售行业资讯，用 DeepSeek 按四个方向挑选精华，生成 Markdown 周报并同步到 Notion。

## 数据源

| 来源 | 类型 | 过滤 |
|---|---|---|
| TechCrunch AI | AI 行业报道 | 无（已是 AI 专栏） |
| The Verge AI | 科技 + AI 新闻 | 无 |
| Hacker News | 社区精选（关键词：AI，前30条） | 无 |
| Retail Dive | 零售行业新闻 | AI 关键词过滤 |
| Modern Retail | 新零售媒体 | AI 关键词过滤 |
| Grocery Dive | 食品零售新闻 | AI 关键词过滤 |

## 本周精选

每周从四个方向各挑一篇，由 DeepSeek 根据标题自动判断：

| 分类 | 筛选标准 |
|---|---|
| 技术前沿 | 涉及具体 AI/LLM 概念、机制、架构，有"如何工作"可拆解的内容 |
| 科普选题 | 有反直觉的机制层可挖，读完能形成一个判断式结论 |
| 行业动态 | 具体公司动作、政策变化、融资/并购/裁员等资本市场信号 |
| 消费者行为 | 美国消费者习惯变化、DTC/零售渠道结构、Amazon 行为信号 |

每篇精选附一句话选择理由，说明"为什么适合这个方向"，而非复述标题。

## 快速开始

```bash
# 安装依赖
npm install

# 创建 .env 文件
echo "DEEPSEEK_API_KEY=your_key" > .env
# 可选：Notion 同步
echo "NOTION_TOKEN=your_token" >> .env
echo "NOTION_PAGE_ID=your_page_id" >> .env

# 立即运行一次
npx tsx src/index.ts

# 定时模式（每周一 08:00 自动运行）
npx tsx src/index.ts --cron
```

周报输出到 `output/YYYY-WNN.md`（如 `2026-W21.md`），重复运行同一周文件会覆盖。

## Notion 同步

每次运行写入两个目标：

| 目标 | 内容 | 分类 |
|---|---|---|
| **AI情报周报**（子页面） | 技术前沿 + 科普选题精选 + 全部文章 | 每周新建一页 |
| **本周精选信号**（数据库） | 行业动态 + 消费者行为精选，含中文标题、核心信号、对中国品牌的意义 | 每条写入一行 |

未配置 `NOTION_TOKEN` 时跳过同步，不报错。

### 配置步骤

**1. 创建 Integration**

前往 [notion.so/my-integrations](https://www.notion.so/my-integrations) → New integration → 填写名称 → 提交。
复制生成的 **Internal Integration Token**，即 `NOTION_TOKEN`。

**2. 准备周报父页面**

新建或选择一个页面作为周报的父页面。打开该页面，点击右上角 `...` → **Connections** → 选择刚创建的 Integration，完成授权。

从页面 URL 复制末尾的 32 位 ID，填入 `notion.ts` 的 `WEEKLY_REPORT_PARENT_ID`：
```
https://notion.so/My-Page-abc123def456...
                            ↑ 这段就是 ID
```

**3. 准备信号数据库**

新建一个数据库，需包含以下字段：

| 字段名 | 类型 |
|---|---|
| 标题 | Title |
| 方向 | Select（选项：行业动态、消费者行为） |
| 核心信号 | Text |
| 来源 | Text |
| 原文链接 | URL |
| 发布日期 | Date |
| 来源周报 | Text |

打开数据库页面，点击右上角 `...` → **Connections** → 添加 Integration 授权。

从数据库 URL 复制末尾的 32 位 ID，填入 `notion.ts` 的 `SIGNAL_DATABASE_ID`。

**4. 写入配置**

本地运行时写入 `.env`：
```bash
echo "NOTION_TOKEN=secret_xxx" >> .env
```

GitHub Actions 时在 Repository secrets 里添加同名变量（见下方）。

## GitHub Actions 自动运行

每周一 00:00 UTC（08:00 CST）自动触发，周报提交到仓库 `output/` 目录并同步到 Notion。

需在仓库 **Settings → Secrets and variables → Actions → Repository secrets** 添加：

| Secret | 说明 |
|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek API key，用于生成本周精选 |
| `NOTION_TOKEN` | Notion Integration token |

## 项目结构

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

## 技术栈

- TypeScript + [tsx](https://github.com/privatenumber/tsx)（无需编译）
- [rss-parser](https://github.com/rbren/rss-parser) — RSS 解析
- [node-cron](https://github.com/node-cron/node-cron) — 定时调度
- [openai](https://github.com/openai/openai-node) — DeepSeek API（OpenAI 兼容格式）
- [@notionhq/client](https://github.com/makenotion/notion-sdk-js) — Notion API
- [@tryfabric/martian](https://github.com/tryfabric/martian) — Markdown → Notion blocks 转换

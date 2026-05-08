# Design System — sbj-website

> Memorable thing: **"在政府门口，但比政府温暖"**
> 创建：2026-05-08 · 来源：/design-consultation
> 演示：[`.planning/design-demo.html`](.planning/design-demo.html)

---

## Product Context

- **What this is**：上海黄浦区社保局智能就业创业 Web 应用
- **Who it's for**：双端
  - 市民端（自助）：失业/求职市民、创业意向者，**带焦虑**
  - 工作人员端（CRM）：黄浦区社保局工作人员
- **Space**：政府服务 + AI 辅助 + 民生
- **Project type**：纯 Web，单 Next.js 应用承载市民端 + 工作人员后台
- **Reference sites**：UK.gov（极简专业政府设计）、人民日报数字版（中文宋体档案感）、Linear（数据后台克制）

## Aesthetic Direction

- **方向**：Editorial / Magazine（编辑/档案感）
- **Decoration level**：Intentional——细线分隔 + 章节编号 + 微纸纹背景
- **Mood**：严肃但有温度。让政府客户看着合规，让失业市民看着不焦虑。
- **不要**：纯政务蓝表格 / SaaS 圆角紫渐变 / 创业风弹簧动画

---

## Typography

中文优先。**Display 用宋体是这套设计的关键 RISK**——95% 政务/SaaS 都用黑体，宋体能做出"档案/认真"感。

| 用途 | 字体 | Weight | 说明 |
|---|---|---|---|
| **Display / Hero** | `Noto Serif SC`（思源宋体 SC） | 600 / 700 | 页面 hero 标题、模块章节标题、报告章节标题 |
| **Body / UI** | `Noto Sans SC`（思源黑体 SC） | 400 / 500 / 700 | 正文、段落、按钮、表单标签 |
| **Data / Tables** | `JetBrains Mono` | 400 / 500 | tabular-nums 数字对齐，报告/表格/手机号 |

### Loading

```html
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700;900&family=Noto+Sans+SC:wght@300;400;500;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

如果国内 Google Fonts 慢：备选 `https://fonts.font.im/` 或自托管 woff2。

### Scale

| 名称 | size / line-height | weight | 字体 |
|---|---|---|---|
| Display Large | 56px / 1.15 | 700 | Serif |
| Display | 40px / 1.2 | 600 | Serif |
| H1 | 28px / 1.3 | 500 | Serif |
| H2 | 20px / 1.4 | 700 | Sans |
| H3 | 16px / 1.5 | 700 | Sans |
| Body Large | 18px / 1.7 | 400 | Sans |
| Body | 16px / 1.7 | 400 | Sans |
| Body Small | 14px / 1.6 | 400 | Sans |
| Caption | 12px / 1.5 | 400 | Sans |
| Mono | 12-14px / 1.5 | 400-500 | Mono, tabular-nums |
| Label Up | 11px / 1.5 | 500 | Sans, letter-spacing 0.12em, UPPERCASE |

### 黑名单（不用）

- 阿里巴巴 PuHuiTi（创业风太强 + 每个产品都长一样）
- HarmonyOS Sans（手机品牌联想）
- system-ui / -apple-system 作为 Display（"我放弃了字体"信号）
- Inter / Roboto / Space Grotesk 作为中文产品的英文 fallback（默认懒）

---

## Color

| Token | Hex | 用途 |
|---|---|---|
| `--ink` | `#1A1A1A` | 主文字（暖灰黑，不是纯黑） |
| `--ink-2` | `#2A2620` | 次级标题 |
| `--ink-3` | `#4A4036` | 正文颜色 |
| `--pencil` | `#6B6157` | 次要文字 / 元信息 |
| `--pencil-light` | `#9A8F82` | 占位文字 / 极弱信息 |
| `--archive-blue` | `#1E3A5F` | **主交互色**：链接、次级按钮、tab active |
| `--archive-blue-deep` | `#15293F` | hover / active 加深 |
| `--archive-blue-soft` | `#E5EAF1` | 轻量背景 |
| `--terra` | `#D97757` | **Accent**：主 CTA、关键标记、强调（克制使用） |
| `--terra-deep` | `#B85E40` | hover / active |
| `--terra-soft` | `#FBEDE5` | 轻量背景（如 hover 卡片） |
| `--paper-bg` | `#FAF8F4` | 页面底色（不是纯白） |
| `--paper-card` | `#F5F1EA` | 卡片背景 |
| `--paper-line` | `#E8E2D5` | 分隔线（默认） |
| `--paper-line-soft` | `#F0EBDE` | 极弱分隔线（表格行） |

### 语义色（5 级帮扶标签直接复用 + 系统状态）

| Token | Hex | 用途 |
|---|---|---|
| `--green` | `#3F7D58` | 易帮扶 / 成功 |
| `--gold` | `#C18B30` | 较难帮扶 / 警告 |
| `--terra` | `#D97757` | 难帮扶（与 accent 同色，故意） |
| `--brick` | `#A14B3C` | 重点帮扶 / 错误 |
| `--ink-2` | `#2A2620` | 托底帮扶（深沉） |
| `--steel` | `#5A6B7C` | 信息 |

### 不用

- 纯蓝 `#2E5BBA` 类政务蓝（太冷）
- SaaS 紫 `#7C3AED`（创业风）
- 鲜橙 `#FF6B35`（创业风太强 / 不庄重）
- 纯黑 `#000`（与暖纸底冲突）
- 纯白 `#FFF` 大面积背景（与暖色系不和）

### Dark mode

**V1 不做**。单兵交付不浪费时间。如要：surfaces 降到 `#1A1410`（暖深褐），accent 降饱和 15%。

---

## Spacing

```css
--s-1: 4px;    --s-2: 8px;    --s-3: 12px;
--s-4: 16px;   --s-5: 24px;   --s-6: 32px;
--s-7: 48px;   --s-8: 64px;   --s-9: 96px;
```

- **Base unit**：8px
- **Density**：
  - 市民端：comfortable（行高 1.7、padding 大、单栏窄阅读）—— 失业市民焦虑，视觉要松
  - 工作人员后台：compact（行高 1.5、表格密、列表多列）—— 数据效率优先

## Layout

- **市民端正文区**：`max-width: 720px`，居中，单栏阅读
- **工作人员后台**：`max-width: 1440px`，左侧 220px 暗色 sidebar + 主区
- **Border radius 阶梯**：
  - `--r-sm: 4px`（按钮、tag、输入框、token）—— 默认
  - `--r-md: 8px`（卡片）—— 谨慎用
  - `--r-lg: 12px`—— 仅特殊情况
  - **不用** `border-radius: 9999px` / pill —— 太创业风
- **不用 box-shadow 炫技** —— 用 `1px solid var(--paper-line)` 划分层次

## Motion

```css
--easing-out: cubic-bezier(0.16, 1, 0.3, 1);
--t-micro: 100ms;
--t-short: 250ms;
--t-medium: 400ms;
```

- **报告章节**：fade-in 250ms，stagger 50ms 顺序进入
- **按钮 hover**：bg / border-color 200ms transition
- **tab 切换**：opacity + 1px underline 250ms
- **不要**：弹簧动画、scroll-driven parallax、酷炫旋转
- **理由**：政府场景 + 焦虑用户，过度动画 = 不稳重 + 加焦虑

---

## Components 约定

### 按钮

| 类型 | 用途 | 样式 |
|---|---|---|
| `.btn-primary` | 主行动（开始诊断、提问、保存）| `bg: --terra`，`color: --paper-bg` |
| `.btn-secondary` | 次行动（查看政策、查看详情）| `border: 1px solid --archive-blue`，hover 反色 |
| `.btn-ghost` | 弱行动（取消、跳过）| `border: 1px solid --paper-line`，hover 加深 |

每个页面**最多一个 primary**。

### 输入框

- `border: 1px solid --paper-line`
- focus: `border-color: --archive-blue`
- 不要圆角 > 4px

### 表格

- 表头小写 + UPPERCASE letter-spacing 0.05em
- 单元格分隔用 `--paper-line-soft`（不是默认 line，避免太密）
- hover 行：`bg: --paper-card`
- 数字列必须 mono + tabular-nums

### 卡片

- `bg: --paper-card`
- `border: 1px solid --paper-line`
- `border-radius: --r-sm`（默认）
- padding: 通常 24-32px
- hover 改 border-color，不要改阴影

### Tag / Pill

- 字号 11-12px
- `padding: 2px 8px` / `border-radius: 2px`（不要 pill）
- 5 级帮扶标签按 token 上色

### 章节编号（编辑感来源）

每个 section 都有：
```html
<div class="section-head-num">§ 1 · CITIZEN HOMEPAGE</div>
```
mono 字体 + terra 色 + UPPERCASE。这是这套设计的**记忆点**之一，必须保留。

---

## RISK / SAFE 决策记录

| 决策 | 类型 | 理由 |
|---|---|---|
| Display 用宋体 `Noto Serif SC` | **RISK** | 95% 政务/SaaS 都黑体；宋体做"档案/认真"感，市民收到报告像收到一份认真给的东西 |
| Accent 用暖橘陶 `#D97757` | **RISK** | 区隔典型政务蓝；克制只用主 CTA + 关键标记 |
| 章节编号 `§ N · TITLE` | **RISK** | 编辑感来源；区隔 SaaS 默认风 |
| 不用阿里 PuHuiTi 等网红免费字体 | **RISK** | 质量好但每个产品都一样，副业商业化要识别度 |
| 米白 `#FAF8F4` 底色（不是纯白）| **RISK** | 暖灰系基底，避免冷漠 |
| Body 用思源黑体 | SAFE | 中文阅读最佳，无争议 |
| Tabular-nums 数据字体 | SAFE | 报告/表格行业标准 |
| 8px 基准间距 | SAFE | 行业标准 |
| `border-radius: 4px` 默认 | SAFE | 不冒险 |
| 不做 dark mode V1 | SAFE | 单兵交付节流 |

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-08 | 初始设计系统创建（基于 V8 plan + Memorable thing "在政府门口，但比政府温暖"）| 政府场景 + 失业市民焦虑 + 副业商业化三股力的折中——编辑感档案风格 |

---

## 实现锚点

- 演示页：`.planning/design-demo.html`（含色板 / 字体规格 / 三个模块卡 / 政策问答 / 诊断报告 / 工作人员后台 / 按钮组件）
- 进入开发后，把演示页里的 CSS variables 直接搬到 `app/globals.css` 的 `:root`，组件按这个 token 系统构建

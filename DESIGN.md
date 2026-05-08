# Design System — sbj-website

> **Version 2.0** · 蓝白 cinematic（抽取自 career-report）
> **Replaces**: v1.0 (暖橘陶 editorial · 已废弃)
> **Updated**: 2026-05-08
> **Reference source**: `D:\career-report\app\globals.css` + `app/page.tsx` + `components/report/*`

---

## 0. Why this exists

sbj-website 后续所有页面（市民端首页、政策问答、诊断流程、报告查看、工作人员后台、admin）必须遵守这份规范，**保持视觉统一**。

**Memorable thing**：cinematic 蓝白 · 既严肃又有温度——政府接受、市民不焦虑、副业母版可复制到其他社保局。

**美学血统**：直接抽取自 `D:\career-report\`。这意味着 sbj-website 视觉约 80% 复用 career-report 已写好的 CSS / 组件 / 动画 / token。开发时**优先 fork career-report 已有代码**，再针对 sbj-website 业务做局部调整。

**Reference sites**（设计灵感同源）：Vercel · Linear · Mercury · Anthropic · Stripe Press。

---

## 1. Visual Theme

| 维度 | 决策 | 反对 |
|---|---|---|
| 整体风格 | Cinematic blue + warm-feeling neutrals | 纯政务蓝表格、暖橘陶 editorial、SaaS 圆角紫渐变 |
| Hero 形态 | 暗色 navy + aurora 渐变 + grid + 星座背景 + 数据可视化（左右分屏） | 纯白 hero + 三栏 features + 默认 CTA |
| Decoration | Intentional——多层装饰（aurora / grid / noise / orbs / constellation 粒子） | Minimalist 极简 / 完全 flat |
| Mood | 严肃而有温度，作品级精致 | 冷漠政府站 / 创业风弹簧 / 朴素 wireframe |
| 字体 | Geist + Noto Sans SC（Google Fonts 强制挂载，跨 Win/macOS 一致） | system-ui / PingFang SC（macOS 字体 Windows 不存在） |
| 数据可视 | 真正的 SVG 可视（雷达图、KPI、bar、sparkline） | 截图 / iframe / 第三方图表组件 |

---

## 2. Color Palette · OKLCH

所有颜色用 OKLCH 空间定义。直接复制到 `app/globals.css :root {}`。

### 2.1 Surface / Ink

```css
--background: oklch(0.985 0.002 240);   /* page bg, cool white */
--foreground: oklch(0.17 0.02 250);     /* main text */
--card: oklch(1 0 0);                    /* card白 */
--muted: oklch(0.96 0.008 240);          /* muted bg */
--muted-foreground: oklch(0.5 0.02 250); /* secondary text */
--border: oklch(0.91 0.01 240);          /* hairline */
```

### 2.2 Blue Scale（核心）

```css
--navy-950: oklch(0.18 0.04 255);    /* hero 深底 */
--navy-900: oklch(0.22 0.06 252);    /* navy bg */
--navy-800: oklch(0.28 0.08 250);    /* heading */
--navy-700: oklch(0.35 0.12 250);    /* body strong */
--blue-700: oklch(0.38 0.20 255);    /* link, deep CTA */
--blue-600: oklch(0.46 0.19 252);    /* hover */
--blue-500: oklch(0.55 0.18 250);    /* primary KPI、accent */
--blue-400: oklch(0.65 0.16 245);    /* highlight */
--blue-300: oklch(0.75 0.12 240);    /* soft highlight */
--blue-200: oklch(0.85 0.07 238);    /* border-on-tinted */
--blue-100: oklch(0.93 0.03 238);    /* tinted bg */
--blue-50: oklch(0.97 0.012 238);    /* lightest tinted */
--gold-500: oklch(0.72 0.12 75);     /* 极少使用，单点强调 */
```

### 2.3 Report Ink（报告页专用）

```css
--report-ink: oklch(0.17 0.02 250);
--report-ink-soft: oklch(0.32 0.05 250);
--report-ink-muted: oklch(0.5 0.02 250);
--report-border: oklch(0.91 0.01 240);
--report-divider: oklch(0.93 0.008 240);
```

### 2.4 Semantic（5 级帮扶 + 状态色）

sbj-website 业务需求：5 级帮扶标签、AI 命中状态、错误警告。

```css
--positive: oklch(0.55 0.15 155);          /* 易帮扶 / 成功 / 命中知识库 */
--positive-soft: oklch(0.96 0.04 155);
--positive-border: oklch(0.85 0.08 155);

--warning: oklch(0.62 0.14 55);            /* 难帮扶 / 警告 / 部分命中 */
--warning-soft: oklch(0.97 0.06 70);
--warning-border: oklch(0.85 0.1 70);

--danger: oklch(0.55 0.20 25);             /* 重点帮扶 / 错误 / 失败 */
--danger-soft: oklch(0.97 0.04 25);
--danger-border: oklch(0.85 0.08 25);
```

### 2.5 5 级帮扶标签 · 颜色映射

| 等级 | Token | 视觉 |
|---|---|---|
| 易帮扶 | `var(--positive)` | 绿圆点 + 绿文字 + 默认边框 |
| 较难帮扶 | `var(--blue-700)` | 蓝圆点 + 蓝文字 + 默认边框（与 accent 同色） |
| 难帮扶 | `var(--warning)` | 金圆点 + 金文字 |
| 重点帮扶 | `var(--danger)` | 红圆点 + 红文字 |
| 托底帮扶 | `var(--navy-950)` | 黑圆点 + 黑文字 + 加粗（最深沉，传达"我们兜着你"） |

---

## 3. Typography

### 3.1 字体栈（必须挂载 Google Fonts）

```html
<!-- app/layout.tsx -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&family=Noto+Sans+SC:wght@300;400;500;600;700&family=Noto+Serif+SC:wght@400;500;600;700&display=swap" rel="stylesheet">
```

```css
--font-sans: "Geist", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
--font-serif: "Noto Serif SC", "Songti SC", "STSong", serif;
--font-mono: "Geist Mono", "JetBrains Mono", "SF Mono", ui-monospace, monospace;
```

**为什么挂 web fonts**：career-report 当前用 PingFang SC + Microsoft YaHei，**在 Windows 上 fallback 到 YaHei（粗笨）导致设计不精致**。Geist + Noto Sans SC 跨平台一致。

### 3.2 黑名单（不用）

- `Inter` / `Roboto` / `Space Grotesk` 作为西文（AI 默认懒）
- `阿里巴巴 PuHuiTi`（创业风太强，每个产品长一样）
- `HarmonyOS Sans`（手机品牌联想）
- `system-ui` / `-apple-system` 作为 Display（"我放弃了字体"信号）

### 3.3 Type Scale

| 名称 | size | line-height | weight | family | 用法 |
|---|---|---|---|---|---|
| `display-xl` | clamp(48, 6.4vw, 96px) | 1 | 600 | sans | Hero 主标题 |
| `display-l` | clamp(32, 4vw, 52px) | 1.05 | 600 | sans | section 头标题 |
| `display` | clamp(24, 2.4vw, 32px) | 1.2 | 600 | sans | 模块标题 |
| `display-serif` | clamp(28, 3vw, 40px) | 1.25 | 500 | serif | Mission statement / 报告封面 / pull quote |
| `h1` | 26px | 1.25 | 600 | sans | 二级标题 |
| `h2` | 20px | 1.4 | 600 | sans | 卡片标题 |
| `h3` | 16px | 1.5 | 600 | sans | 小节标题 |
| `body-l` | 17px | 1.7 | 400 | sans | 长文 body |
| `body` | 15px | 1.65 | 400 | sans | 默认 body |
| `body-s` | 13px | 1.55 | 400 | sans | 辅助文字 |
| `mono` | 11-13px | 1.55 | 400-500 | mono · tabular-nums | 数据 / metadata / eyebrow |
| `eyebrow` | 11px | 1 | 500 | mono · letter-spacing 0.16em · uppercase | section eyebrow |

**关键约束**：
- Display 字号 `letter-spacing: -0.045em`（极致紧凑，Vercel 风）
- Body 字号 `letter-spacing: -0.005em`（轻微紧凑）
- 所有数字必须 `font-variant-numeric: tabular-nums`
- Eyebrow / metadata 必须 mono + uppercase + letter-spacing 0.16em

---

## 4. Spacing & Layout

### 4.1 Spacing scale（8px base）

```css
--s-1: 4px;   --s-2: 8px;    --s-3: 12px;
--s-4: 16px;  --s-5: 24px;   --s-6: 32px;
--s-7: 48px;  --s-8: 64px;   --s-9: 96px;
--s-10: 144px; /* section vertical padding */
```

### 4.2 容器宽度

```css
.container { max-width: 1240px; padding: 0 40px; }   /* 主容器 */
.container-narrow { max-width: 880px; padding: 0 40px; } /* 文章/报告 */
.container-prose { max-width: 720px; padding: 0 40px; }  /* 长文阅读 */
```

### 4.3 Section padding

- 标准 section: `padding: 144px 0;`
- 紧凑 section（连续多个）: `padding: 88px 0;`
- Hero: `padding: 88px 0 112px;`

### 4.4 Border radius

```css
--r-sm: 4px;   /* button, input, tag */
--r-md: 6px;   /* card 默认 */
--r-lg: 8px;   /* large card */
--r-xl: 12px;  /* hero card / report-card 极特殊 */
--r-2xl: 16px; /* report-card */
```

**禁止** `border-radius: 9999px` 满天飞（pill 满屏 = AI default）。仅在 badge / dot / avatar circle 用。

---

## 5. Surfaces & Elevation

career-report 的招牌：**层叠装饰背景** + glass-card + spotlight + gradient border。这是"作品感"的核心来源。

### 5.1 Hero 暗色多层装饰（关键）

```html
<section class="relative min-h-[90vh] overflow-hidden">
  <div class="absolute inset-0 bg-gradient-to-b from-[var(--navy-950)] via-[var(--navy-900)] to-[var(--navy-800)]" />
  <div class="absolute inset-0 aurora-bg" />        <!-- 渐变 mesh -->
  <div class="absolute inset-0 hero-grid" />        <!-- 网格 -->
  <div class="absolute inset-0 noise-overlay" />    <!-- 噪点 -->
  <ConstellationBG />                                <!-- 星座粒子 -->
  <!-- decorative orbs -->
  <div class="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] rounded-full bg-[var(--blue-500)] opacity-[0.06] blur-[150px]" />
  <!-- vertical accent lines -->
</section>
```

详见 `D:\career-report\app\page.tsx` Hero 部分。**直接 fork**。

### 5.2 Glass card

```css
.glass-card {
  background: linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,255,255,0.82));
  backdrop-filter: blur(20px) saturate(1.4);
  border: 1px solid rgba(255,255,255,0.6);
  box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8);
}
```

### 5.3 Spotlight card（鼠标跟随光晕）

直接 fork career-report `app/page.tsx:81-106` 的 `SpotlightCard` 组件。

### 5.4 Gradient border（hover 显现彩色边）

直接 fork career-report `globals.css:336-368` 的 `.gradient-border-card`。

### 5.5 Btn glow（主 CTA 蓝色发光）

```css
.btn-glow {
  box-shadow:
    0 0 0 1px oklch(0.55 0.18 250 / 0.5),
    0 1px 3px rgba(0,0,0,0.1),
    0 4px 20px oklch(0.55 0.18 250 / 0.25);
}
.btn-glow:hover {
  box-shadow:
    0 0 0 1px oklch(0.65 0.16 245 / 0.6),
    0 8px 32px oklch(0.55 0.18 250 / 0.4),
    0 0 60px oklch(0.55 0.18 250 / 0.15);
  transform: translateY(-1px);
}
```

### 5.6 Report card（报告页专用）

```css
.report-shell {
  background:
    linear-gradient(180deg, var(--blue-50) 0%, transparent 40%),
    radial-gradient(900px 500px at 100% 10%, oklch(0.9 0.04 250 / 0.4), transparent 60%),
    #fff;
}
.report-card {
  background: #fff;
  border: 1px solid var(--report-border);
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03), 0 2px 8px rgba(15, 23, 42, 0.03);
}
```

---

## 6. Motion

### 6.1 Easing

```css
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);   /* 默认 */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.16, 1, 0.3, 1);  /* 弹性收尾 */
```

### 6.2 Duration

| 用途 | 时长 |
|---|---|
| micro（hover / focus） | 200ms |
| short（按钮 / tab 切换） | 250-300ms |
| medium（scroll reveal） | 450-700ms |
| long（hero 入场） | 800-1200ms |
| signature（aurora drift） | 20s loop |

### 6.3 命名动画（来自 career-report globals.css）

| Class | 用途 |
|---|---|
| `aurora-bg` | Hero 暗底渐变 mesh，20s loop drift |
| `border-beam` | 边框扫光（4s rotate） |
| `animate-float` / `-delayed` / `-slow` | 图标轻微漂浮 |
| `pulse-dot` | 数据点呼吸光晕 |
| `radar-sweep` | 雷达图扫描线 6s loop |
| `dash-animated` | 虚线流动（连接线） |
| `text-shimmer` | 文字闪光（数据 counter） |
| `text-gradient-hero` | Hero 主标题白→淡蓝渐变 |
| `constellation-line` | 星座线脉动 |
| `animate-cta-pulse` | 主 CTA 阴影呼吸 2.4s |
| `stat-underline` | stat 数字下方蓝线 |

### 6.4 Scroll reveals（必须用）

```tsx
import { motion, useInView } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }
  })
};
```

每个 section 进入视口时 stagger 入场，永不同时 mount。

### 6.5 `prefers-reduced-motion` 必须支持

```css
@media (prefers-reduced-motion: reduce) {
  .animate-cta-pulse, .aurora-bg, .pulse-dot { animation: none; }
}
```

---

## 7. Component Library

### 7.1 Button（4 层级）

| Variant | 用法 | 样式 |
|---|---|---|
| `primary` | 唯一主 CTA | `bg-[var(--blue-500)] text-white rounded-2xl ring-2 ring-white/20 + btn-glow + animate-cta-pulse` |
| `secondary` | 次行动 | `bg-white text-[var(--navy-900)] border border-[var(--blue-200)]` |
| `soft` | 弱行动 | `bg-[var(--blue-50)] text-[var(--navy-700)]` |
| `link` | inline 链接 | underline + `text-[var(--blue-600)]` |

每页**最多一个 primary**。

### 7.2 Badge（小标签）

```tsx
<Badge variant="outline" className="border-white/15 bg-white/[0.05] text-white/70 backdrop-blur-md px-4 py-1.5 text-xs tracking-[0.15em] font-light">
  <span className="size-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse" />
  智能职业定位分析系统
</Badge>
```

Hero 暗底用 outline + backdrop-blur；亮底用 secondary 实色。

### 7.3 Stats counter

直接 fork career-report `app/page.tsx:47-78` 的 `AnimatedCounter`。配 `stat-underline` class。

### 7.4 Spotlight card

直接 fork `SpotlightCard` 组件 + `.spotlight-card` CSS。卡片内套 `glass-card gradient-border-card`。

### 7.5 Report KPI

```tsx
<div className="report-kpi">
  <span className="n">17</span>
  <span className="u">/ 20</span>
</div>
```

```css
.report-kpi .n {
  font-size: clamp(20px, 3.4vw, 36px);
  font-weight: 700;
  color: var(--blue-500);
  letter-spacing: -0.02em;
}
.report-kpi .u {
  font-size: 11px;
  color: var(--report-ink-muted);
}
```

### 7.6 Report chip（带语义色）

```tsx
<span className="report-chip" data-tone="positive">强</span>
<span className="report-chip" data-tone="warning">一般</span>
<span className="report-chip" data-tone="danger">弱</span>
```

详见 `globals.css:574-604`。直接 fork。

### 7.7 Report bar（蓝渐变进度条）

```css
.report-bar { height: 6px; background: var(--blue-100); border-radius: 9999px; }
.report-bar-fill { background: linear-gradient(90deg, var(--blue-400), var(--blue-600)); }
```

### 7.8 Report takeaway（章节核心观点）

```css
.report-takeaway {
  border-left: 3px solid var(--blue-500);
  padding: 10px 14px;
  background: var(--blue-50);
  border-radius: 0 8px 8px 0;
  color: var(--navy-800);
}
```

### 7.9 Section wrapper（报告章节容器）

直接 fork `D:\career-report\components\report\section-wrapper.tsx`。约定：
- 编号 `01 / 06` mono pill + `Section` eyebrow
- 标题 + meta
- 可选 takeaway 引言块
- 内部内容
- `data-pdf-section` attribute（PDF 导出用）

### 7.10 Tag（5 级帮扶 + 通用）

```tsx
<span className="tag" data-level="easy">易帮扶</span>
<span className="tag" data-level="semi">较难帮扶</span>
<span className="tag" data-level="hard">难帮扶</span>
<span className="tag" data-level="focus">重点帮扶</span>
<span className="tag" data-level="bottom">托底帮扶</span>
```

```css
.tag {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 9px;
  font-family: var(--font-mono);
  font-size: 11px; font-weight: 500;
  letter-spacing: 0.04em;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: white;
}
.tag::before { content: ""; width: 6px; height: 6px; border-radius: 50%; }
.tag[data-level="easy"]::before { background: var(--positive); }
.tag[data-level="semi"]::before { background: var(--blue-500); }
.tag[data-level="hard"]::before { background: var(--warning); }
.tag[data-level="focus"]::before { background: var(--danger); }
.tag[data-level="bottom"]::before { background: var(--navy-950); }
```

### 7.11 Sandbox（嵌入式产品片段）

`url-bar dots + url + tag` + 内部 `.frag-qa-q / .frag-qa-meta / .frag-qa-a / .frag-qa-cite`。详见之前的 v7 demo `design-demo-blue.html` 实现，可直接 fork。

### 7.12 Admin sidebar

`navy-950` 暗底 + 白文字 + `rgba(255,255,255,0.07)` active state + brand mark + section eyebrows + user pill at bottom。

### 7.13 Admin table

```css
th {
  font-family: var(--font-mono);
  font-size: 10px; font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--ink-muted);
  background: var(--paper);
}
td { padding: 14px 18px; border-bottom: 1px solid var(--line-soft); }
.avatar { /* squircle 4px, blue-50 bg, blue-700 text, blue-100 border */ }
```

---

## 8. Page Templates

### 8.1 市民端首页

**结构**（fork career-report `app/page.tsx`，改业务文案）：
1. **Hero**（暗 navy + aurora + grid + constellation + 雷达可视）
2. **Process steps** 三卡片（政策问答 / 职业诊断 / 创业诊断）+ 连接虚线
3. **Stats bar** 4 数字（30 篇政策 · 5 级帮扶 · ?? 已服务 · 平均 12 分钟）
4. **Features** 2x2（核心能力）
5. **Trust** 暗底 banner + 政府服务标准 / AI 技术驱动 / 数据安全
6. **Footer**（简洁，加 colophon）
7. `MobileStickyCTA` 浮动 CTA

### 8.2 政策问答页 `/qa`

**新页面**（career-report 没有，sbj-website 新做）：
- Hero 较短（不要全屏 navy，用 white + 简单 eyebrow + h1）
- **双页签**：政策与办事 · 创业与行业（spec 见 V8 plan §4）
- 3 个热点问题预设
- 自由问输入框
- AI 回答区：左 2px navy rule + AI badge + 命中状态 + 引用 + 免责
- 1000 字限制 + tabular-nums 字符计数

### 8.3 诊断流程页 `/diagnosis/career`

**多步流程**（fork career-report `app/form` + `app/quiz` + `app/interview`）：
- Step 1: 输入页（简历/学历/经验/目标岗）
- Step 2: 量表 12 道（career-report 是 6 道，扩到 12）
- Step 3: AI 访谈 4 题
- Step 4: 报告生成 loading（fork career-report `app/loading`）

### 8.4 报告查看页 `/report`

**直接 fork** career-report `app/report/page.tsx` + 6 个 section 组件。改 prompt + 业务字段，结构和组件不变。
- 用 `report-shell` 包外层
- 用 `SectionWrapper` 包每章
- KPI / chip / bar / takeaway / radar 全部复用

### 8.5 工作人员后台 `/admin`

**fork** career-report `app/admin`，扩展为：
- Sidebar（市民管理 / 诊断记录 / 服务跟踪 / 知识库 / 数据看板）
- 市民列表（5 级帮扶筛选 + table）
- 市民详情（简档 + 历史诊断 + 服务记录 timeline）
- 知识库 wiki 编辑（markdown）

### 8.6 Mobile

career-report 已有 `MobileStickyCTA` 浮动按钮 + 响应式 grid。所有页面必须保证：
- 手机端可读（量表、雷达图、KPI 都要响应式）
- 触屏 tap target ≥ 44px
- 不需要横屏才能用

---

## 9. Hard Don'ts（AI Slop 黑名单）

不允许出现在任何 sbj-website 页面：

1. ❌ **紫色/紫蓝渐变**（"AI 美学"标志）
2. ❌ **emoji 当 icon**（📜 📊 🚀 等）—— 用 lucide-react icons
3. ❌ **三栏等分 features grid 配 emoji 圆形 icon**——AI default 第一名
4. ❌ **`text-gradient` 在 body 字上**（只能用在 Hero 主标题）
5. ❌ **Inter / system-ui** 作为主西文字体
6. ❌ **`PingFang SC`** 不挂 web 字体直接用（Windows 显示 YaHei，丑）
7. ❌ **`border-radius: 9999px`** 满屏 pill
8. ❌ **`box-shadow: 0 0 60px purple`** 紫色发光
9. ❌ **居中所有 hero**——用 lg:左对齐 + 右侧可视化
10. ❌ **AI 文案陈词**："Elevate" / "无缝" / "释放" / "下一代" / "为您打造"
11. ❌ **"John Doe" / "Acme Corp"** 占位名——用真实感中文姓名
12. ❌ **整数百分比**（99.99% / 50%）—— 用真实有机数字（47.2% / 12.8% / +12%）

---

## 10. Implementation Notes

### 10.1 项目脚手架（fork career-report）

```bash
# 不重新初始化，直接 fork 整个项目作为母版
cp -r D:/career-report/* D:/workspace/01_项目-Coding/sbj-website/
cd D:/workspace/01_项目-Coding/sbj-website/
# 删除 career-report 业务代码，保留：
# - globals.css （直接用）
# - components/ui/* （直接用）
# - components/report/* （fork 改 prompt + 字段）
# - lib/report-shared.ts / pdf-export.ts / admin-session.ts （直接用）
# - app/api/interview/* （改 prompt）
# - app/page.tsx (fork，改 hero 文案 / steps / stats / features)
```

### 10.2 关键依赖（career-report 已有）

```json
"@base-ui/react": "shadcn",
"framer-motion": "*",
"lucide-react": "*",
"next": "16.2.x",
"tailwindcss": "v4",
"tw-animate-css": "*"
```

### 10.3 字体加载（替换 globals.css 的 font-family）

```css
/* 旧：var(--font-sans) = "PingFang SC", "Microsoft YaHei"... */
/* 新：必须先 import Google Fonts in layout.tsx */
@theme inline {
  --font-sans: "Geist", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  --font-serif: "Noto Serif SC", "Songti SC", serif;
  --font-mono: "Geist Mono", "JetBrains Mono", "SF Mono", monospace;
}
```

国内 Google Fonts 慢的话，备选 `https://fonts.font.im/` 或自托管 woff2。

### 10.4 必须配的全局 CSS classes（globals.css 已有，直接用）

`aurora-bg` `hero-grid` `noise-overlay` `border-beam` `animate-float` `pulse-dot` `radar-sweep` `dash-animated` `text-shimmer` `spotlight-card` `gradient-border-card` `btn-glow` `text-gradient-hero` `constellation-line` `stat-underline` `glass-card` `report-shell` `report-card` `report-kpi` `report-takeaway` `report-chip` `report-quote` `report-bar` `report-divider` `animate-cta-pulse`

---

## 11. Decisions Log

| Date | Decision | Why |
|---|---|---|
| 2026-05-08 | DESIGN.md v2.0 取代 v1.0（暖橘陶 → 蓝白） | 用户认 career-report 视觉，v1 暖橘陶方向已偏离；v2 直接抽取 career-report 实际代码 |
| 2026-05-08 | 字体改 Geist + Noto Sans SC（Google Fonts） | career-report 用 PingFang SC，Windows 上 fallback 到 YaHei，渲染粗笨——挂 Google Fonts 解决 |
| 2026-05-08 | 5 级帮扶用 OKLCH 语义色 | 对齐 sbj-website 业务（V8 plan §2.4），与 career-report 既有蓝色系兼容 |
| 2026-05-08 | sbj-website 优先 fork career-report 代码 | 80% 视觉复用，节省开发时间，统一品牌（副业母版可复制到其他社保局） |

---

## 12. Reference Files（每次开发前必读）

- `D:\career-report\app\globals.css` — 完整 CSS 系统
- `D:\career-report\app\page.tsx` — 首页结构（fork 母版）
- `D:\career-report\app\report\page.tsx` — 报告页入口
- `D:\career-report\components\report\section-wrapper.tsx` — 报告章节包装器
- `D:\career-report\components\report\overview-section.tsx` — 章节示例（含 emerald/amber 优势/补齐配色）
- `~\.claude\plans\1-giggly-cat.md` — sbj-website V8 plan（业务规范）
- `D:\workspace\01_项目-Coding\sbj-website\.planning\PROJECT.md` — 项目身份
- `D:\workspace\01_项目-Coding\sbj-website\.planning\REQUIREMENTS.md` — 60+ 需求清单

---

## 13. Agent Prompt Guide（给 Claude Code 写代码用）

后续在 sbj-website 写任何页面时，必须按以下顺序确认：

1. ✅ 读 `DESIGN.md`（本文件）—— 确认 token 和组件库
2. ✅ 读 `D:\career-report\app\globals.css` —— 确认 CSS classes 都存在
3. ✅ 检查页面类型 —— 见 §8 Page Templates
4. ✅ 优先 **fork career-report 已有页面** 改 prompt + 业务字段
5. ✅ 不允许引入新字体、新色板、新动画 class
6. ✅ 自检黑名单 §9（emoji / 紫渐变 / pill / Inter / 居中 hero / AI 文案）
7. ✅ 跑响应式（手机端 + tablet + desktop）
8. ✅ 跑 reduced-motion 测试

如果 sbj-website 出现 career-report 没有的新组件需求（比如政策问答的双页签、5 级帮扶 tag），优先：
- 用现有 token 组合
- 命名延续 career-report 命名习惯
- 加入 §7 Component Library

---

*Generated 2026-05-08 from /design-consultation v2 + /plan-design-review · DESIGN.md v2.0*

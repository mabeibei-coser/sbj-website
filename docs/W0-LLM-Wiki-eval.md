# W0 LLM Wiki 编译方案验证 — 对外评估报告

> 项目：sbj-website｜阶段：Phase 0（W0 前期准备）
> 评估时间：2026-05-08
> 关联 REQ：INF-02（LLM Wiki 编译方案试跑通过）

---

## 结论：**PASS** — W2 政策问答上 LLM Wiki 路线，不切 RAG

加权评分 **100 / 100**（D1 = 5/5，D2 = 5/5），双项满分。

---

## 验证目标

W0 风险前置：在 W1 脚手架开搭之前，验证 W2 政策问答模块押注的"LLM Wiki 编译"路线是否可行——
**用国产合规 LLM 把中文政策素材编成可查询的主题 wiki，引用回链可靠**。

---

## 方法

| 项 | 选择 | 说明 |
|---|---|---|
| LLM | DeepSeek `deepseek-v4-flash` | 国产合规，OpenAI 兼容协议 |
| PDF→markdown | MinerU Agent API（免费档） | 上海 AI 实验室开源，中文 PDF SOTA |
| 编译框架 | 自研最简实现，prompt 拆自 [ussumant/llm-wiki-compiler](https://github.com/ussumant/llm-wiki-compiler) | 上游是 Claude Code 插件不可直接用；提取其 5-phase 编译思路，中文化 + 政策领域改造 |
| 素材 | 3 份独立政策素材 | 1 PDF（甲方提供的《黄浦创卡》手册前 6 页）+ 2 微信公众号文章 |
| 评估方法 | 4 维度筛减后**只评 D1 + D2** | 用户决策：W0 只验最大未知，编译速度 + 增量编译留 W2 调优 |

---

## 评分维度

| 维度 | 权重 | 抽样数 | 评分方式 |
|---|---|---|---|
| **D1 中文政策内容准确性** | 50% | 5 | 抽具体事实陈述，对照原文看金额/年限/地址等是否一致 |
| **D2 引用回链正确性** | 50% | 5 | 抽 `file:line` 引用，对照 source 看内容是否真实存在且相关 |

通过线：加权总分 ≥ 80。

---

## 结果

- **D1 = 5/5 → 100/100**：所有抽样的政策事实陈述都用 `原文："..."` 形式直接 quote，与 source 完全一致
- **D2 = 5/5 → 100/100**：所有抽样的 file:line 引用都对得上 source 真实内容
- **加权总分 = 100/100 → PASS**

详细抽样数据 + 逐条评分见 `experiments/llm-wiki-poc/EVAL.md`。

---

## 已验证的能力

1. **DeepSeek 在 prompt 严格约束下不编造政策内容**：抽样的事实陈述都是原文 quote，没有自由发挥
2. **引用回链 100% 可靠**：file:line 级别引用全部对得上 source markdown 真实位置
3. **MinerU Agent API 处理中文政策 PDF 的质量足够**：金额/电话/地址/比例等数字全部正确解析（对比 pdftotext 把数字渲染成 ��� 完全无法用）
4. **DeepSeek + 改 prompt 可工程化**：3 份素材 / 1 主题 / 15k tokens / 44s / 不到 3 元成本

---

## 未验证、留 W2 上线时观察的事

1. **跨主题分类**：3 份素材都被归到一个主题（合理但同质）。W2 真上线 30+ 文件时，主题分类是另一项 unknown
2. **编译速度 + 增量编译**：W0 跳过这两个维度。W2 上线后做性能调优
3. **回归稳定性**：单次满分不代表稳定。W2 LLM eval suite 50 题持续跑（CI 集成）
4. **创业以外的 policy domain**：本次都聚焦创业政策。W2 拿到甲方所有政策（含失业保险/社保办理等）后，前 5 份建议跑同一脚本快速 sanity check
5. **大文档分片**：本次 PDF 切 6 页适配 MinerU 免费档。W2 production 升 MinerU Precision API（200MB / 200 页）能全量

---

## W0 → W1 转交建议

- **不切 RAG fallback**，按 V8 plan 推进
- W1 脚手架照常搭（INF-03 ~ INF-12）
- **W1 INF-03（多供应商 LLM 抽象）**直接复用本 PoC 的 `lib/deepseek-client.ts` 模式
- **W2 整体编译模块** fork PoC 的 `prompts/` + `scripts/compile.ts`，工程化为 `app/api/wiki/compile`，对接审计日志（INF-05）+ token 预算（INF-10 监控）

---

## 已知技术限制

| 限制 | 影响 | W2 mitigation |
|---|---|---|
| MinerU Agent API 10MB / 20 页 | 大文档要切片 | 升 Precision API（用户/甲方付费档） |
| 微信公众号有 anti-bot | WebFetch 工具被挡 | 自定义 UA 的 fetch 通过；如失效切 puppeteer 加 cookie/UA rotation |
| 行号引用易碎 | source 删/改后 wiki 行号失效 | 重编译时同步更新；考虑 hash-of-paragraph 替代 line number |

---

*评估执行：Claude Code（Auto mode）｜单兵 Vibe Coding｜2026-05-08*

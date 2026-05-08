# LLM Wiki POC — W0 试跑

> **目的**：W0 风险前置 — 验证 DeepSeek 能否把 3 份中文政策素材编译成 W2 可用的 topic-based wiki，且引用回链可靠。
>
> **不是生产代码**。仅 W0 用一次。结论决定 W2 上线 LLM Wiki 还是切 LangChain RAG。

## 来源

- 上游 `llm-wiki-compiler`（[ussumant/llm-wiki-compiler](https://github.com/ussumant/llm-wiki-compiler)，MIT）clone 在 `upstream/`，仅作 prompt 拆解参考，不直接使用（它是 Claude Code 插件）
- 本 PoC 的 prompts 在 `prompts/` 目录（中文化 + 政策领域 framing）

## 跑一次

```bash
# 1. 装依赖
npm install

# 2. 配 .env.local（拷自 .env.example）
cp .env.example .env.local
# 填 DEEPSEEK_API_KEY 和 MINERU_API_KEY

# 3. 把素材放到 sources-raw/（PDF + 网址列表）

# 4. PDF → markdown（MinerU API）
npm run pdf-to-md -- sources-raw/policy-1.pdf
npm run pdf-to-md -- sources-raw/policy-2.pdf

# 5. 网址 → markdown
npm run url-to-md -- "https://..."

# 6. 编译 wiki
npm run compile

# 7. 跑评估（输出抽样 + 评分模板让人填）
npm run evaluate

# 8. 看结果
cat EVAL.md
```

## 通过判定

- D1（中文政策内容准确性）≥ 4/5 + D2（引用回链正确性）≥ 4/5 → 加权 ≥ 80 → PASS
- 任一维度 < 60 → FAIL，看 `FALLBACK.md` 切 RAG 决策

详见 [PLAN](../../../C:/Users/admin/.claude/plans/robust-purring-plum.md) Slice B。

## 目录

```
.
├── upstream/                  # cloned llm-wiki-compiler，仅参考
├── prompts/                   # 中文化政策版 prompts
├── lib/deepseek-client.ts     # OpenAI 兼容协议调 DeepSeek
├── scripts/
│   ├── pdf-to-md.ts           # MinerU PDF→markdown
│   ├── url-to-md.ts           # WebFetch URL→markdown
│   ├── compile.ts             # 主编译（DeepSeek 驱动）
│   └── evaluate.ts            # 评估抽样 + 模板
├── sources-raw/               # 原始 PDF / 网址抓回的 HTML
├── sources/                   # 转换后的 3 份 markdown（compile 输入）
├── wiki/                      # 编译产物（INDEX + topics/）
├── reports/                   # 编译日志 + 评估报告
├── test-cases.json            # 5 个抽样政策问题
├── EVAL.md                    # 最终评估报告
└── FALLBACK.md                # 仅 FAIL 时写
```

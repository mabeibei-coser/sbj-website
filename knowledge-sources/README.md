# knowledge-sources — 政策知识库原始素材（MinerU 提取版）

> 这里存放的是通过 MinerU API 从 PDF/网页提取的 markdown 文件。
> 是 Phase 2 wiki 编译（`app/api/wiki/compile`）的直接输入。
> 原始 PDF 大文件放 `knowledge/`（gitignored），markdown 提取物可以入库。

---

## 文件清单

| 文件 | 来源 | 内容 | 行数 |
|------|------|------|------|
| `chuangka-full-p01-06.md` | 创卡手册1023.pdf 第 1-6 页 | 引言 + 申请对象 + 政策福利 01-04（场地/补贴/融资/落地） | 101 |
| `chuangka-full-p07-12.md` | 创卡手册1023.pdf 第 7-12 页 | 政策福利 05-08 + 申请材料 + 3 个申请通道 + 评审流程 + 创卡管理 + 孵化载体列表 | 197 |
| `ji-she-kong-jian.md` | 微信文章（极社空间） | 黄浦创业孵化基地政策介绍 | 477 |
| `jiu-zheng-ce-2.md` | 微信文章（就业政策） | 创业担保贷款 + 就业补贴政策细则 | 40 |

## Phase 2 使用方式

```
knowledge-sources/*.md
    → app/api/wiki/compile（调 DeepSeek 生成 wiki 文章）
    → wiki_pages 表（Phase 1 已建）
    → /a500 政策问答 UI
```

## 提取时间

- `chuangka-full-*`：2026-05-08，MinerU Agent API（免费档）
- `ji-she-kong-jian.md` / `jiu-zheng-ce-2.md`：2026-05-08，MinerU Agent API（PoC 阶段）

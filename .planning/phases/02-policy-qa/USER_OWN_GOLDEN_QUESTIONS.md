# User Own Golden Questions（用户填空）

> 来源：D-20 / Phase 2 success criterion #4
> 50 题中 20 题由用户（HR 专业 + 黄浦政策熟）手工填写。AI 不替写。
> 请按下面 schema 填到 `tests/llm-eval/golden-questions.json` 的对应 `qa-policy-user-NNN` 条目。

## 推荐覆盖（用户可调整）

覆盖创卡手册 4 大福利板块，共 20 题：

- **创卡 4 大福利板块**（场地扶持 / 创卡补贴 / 融资支持 / 落地补贴），每个福利点至少 1 题（共约 9 题）
  - 01.场地扶持：零成本工位期限、孵化补贴金额与条件
  - 02.创卡补贴：一次性创业补贴金额与时限
  - 03.融资支持：担保贷款额度（创业前 / 个人 / 组织）、雏鹰计划 / 雄鹰计划
  - 04.落地补贴：开办费补贴、带动就业补贴年限、社保补贴人数上限
- **创业孵化基地**：入驻条件、工位补贴具体数字、知名基地名称（共 4 题）
- **就业补贴 5 类**：创业担保贷款、灵活就业社保补贴、求职创业补贴、一次性创业补贴、创业带动就业补贴，每类 1 题（共 5 题）
- **劳动权益**：失业登记流程、待业期社保、最低工资标准（共 2 题）

## 填写 schema（每题 4 字段）

1. **question**：市民实际可能问的问题（口语化，不要太学术）。
   例："我刚毕业失业了，能领什么补贴？"
2. **expectedKeywords**：3-5 个，是 LLM 答对该问题时**必须**包含的中文短语（可包括金额数字、政策名、办理流程关键词）。
   例：`["失业登记", "失业保险金", "高校毕业生"]`
3. **expectedSourceSlug**：你预期 LLM 回答应引用的 wiki 主题 slug（在 02-01 编译时确定的；如不确定先填 `"<unknown>"`，eval 跑出来后再校准）。
   常见 slug 参考：
   - `huangpu-card` — 黄浦创卡手册
   - `incubator` — 创业孵化基地
   - `startup-loan` — 创业担保贷款
   - `youth-employment` — 青年就业补贴
   - `unemployment-insurance` — 失业保险金
4. **expectedStatus**：`"hit"` / `"partial"` / `"miss"`。

## 填写位置

找到 `tests/llm-eval/golden-questions.json` 中 `qa-policy-user-001` 到 `qa-policy-user-020` 这 20 条记录，把 `<USER TODO>` 替换成实际值。

示例（填写后的格式）：

```json
{
  "id": "qa-policy-user-001",
  "kbType": "policy",
  "question": "我刚毕业失业了，能领多少失业保险金？",
  "expectedKeywords": ["失业保险金", "最低工资", "高校毕业生"],
  "expectedSourceSlug": "unemployment-insurance",
  "expectedStatus": "hit",
  "category": "user_own"
}
```

## 运行验证

填完后运行：

```bash
npm run llm-eval
```

mock 模式不需要真 LLM key，会直接 skip 所有 `<USER TODO>` 还未填写的题，并在报告末尾提示"N items skipped"。

如果你已填完 20 题，则 `totalCounted` 会从 30 增加到 50，`accuracy` 和 `citationRate` 按实际 mock fixture 命中率计算。

如要跑真 LLM（需 W0 完成后，有 DB + LLM key + 已 publish 的 wiki 数据）：

```bash
npm run llm-eval:real
```

报告查看哪些题真 LLM 答错，针对调 wiki 内容或 prompt。

## 填写进度

- [ ] qa-policy-user-001
- [ ] qa-policy-user-002
- [ ] qa-policy-user-003
- [ ] qa-policy-user-004
- [ ] qa-policy-user-005
- [ ] qa-policy-user-006
- [ ] qa-policy-user-007
- [ ] qa-policy-user-008
- [ ] qa-policy-user-009
- [ ] qa-policy-user-010
- [ ] qa-policy-user-011
- [ ] qa-policy-user-012
- [ ] qa-policy-user-013
- [ ] qa-policy-user-014
- [ ] qa-policy-user-015
- [ ] qa-policy-user-016
- [ ] qa-policy-user-017
- [ ] qa-policy-user-018
- [ ] qa-policy-user-019
- [ ] qa-policy-user-020

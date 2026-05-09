/**
 * TDD tests for llm-eval run.ts helper functions (QA-11)
 *
 * RED phase: these tests expect exports that Phase 1 skeleton does NOT have.
 * Run `npx vitest run tests/llm-eval/run.test.ts` — should FAIL before Task 2 GREEN.
 */

import { describe, it, expect } from "vitest";
import { hasUserTodo, checkKeywords, checkCitations, loadGolden } from "./run";

describe("hasUserTodo", () => {
  it("returns true when question is <USER TODO>", () => {
    const item = {
      id: "qa-policy-user-001",
      kbType: "policy" as const,
      question: "<USER TODO>",
      expectedKeywords: [],
      expectedSourceSlug: "<USER TODO>",
      expectedStatus: "miss" as const,
      category: "user_own",
    };
    expect(hasUserTodo(item)).toBe(true);
  });

  it("returns false for a normal question", () => {
    const item = {
      id: "qa-policy-hot-1",
      kbType: "policy" as const,
      question: "失业人员每月领取的失业保险金标准是多少？",
      expectedKeywords: ["失业保险金", "最低工资", "80%"],
      expectedSourceSlug: "unemployment-insurance",
      expectedStatus: "hit" as const,
      category: "hot",
    };
    expect(hasUserTodo(item)).toBe(false);
  });
});

describe("checkKeywords", () => {
  it("returns pass=true and empty missing when all keywords found", () => {
    const result = checkKeywords("失业保险金每月按最低工资的80%发放", ["失业保险金", "每月"]);
    expect(result.pass).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("returns pass=false and missing keywords when keyword not found", () => {
    const result = checkKeywords("abc", ["失业保险金"]);
    expect(result.pass).toBe(false);
    expect(result.missing).toEqual(["失业保险金"]);
  });

  it("returns pass=true for empty expectedKeywords", () => {
    const result = checkKeywords("anything", []);
    expect(result.pass).toBe(true);
    expect(result.missing).toEqual([]);
  });
});

describe("checkCitations", () => {
  it("returns true when citations contain expectedSourceSlug", () => {
    const item = {
      id: "qa-policy-hot-1",
      kbType: "policy" as const,
      question: "问题",
      expectedKeywords: [],
      expectedSourceSlug: "unemployment-insurance",
      expectedStatus: "hit" as const,
      category: "hot",
    };
    const result = checkCitations(["/wiki/policy/unemployment-insurance"], item);
    expect(result).toBe(true);
  });

  it("returns false when citations do not contain expectedSourceSlug", () => {
    const item = {
      id: "qa-policy-hot-1",
      kbType: "policy" as const,
      question: "问题",
      expectedKeywords: [],
      expectedSourceSlug: "xxx",
      expectedStatus: "hit" as const,
      category: "hot",
    };
    const result = checkCitations(["https://evil.com"], item);
    expect(result).toBe(false);
  });

  it("returns true for miss status with empty citations (no citation required)", () => {
    const item = {
      id: "qa-policy-fab-1",
      kbType: "policy" as const,
      question: "问题",
      expectedKeywords: [],
      expectedSourceSlug: "",
      expectedStatus: "miss" as const,
      category: "fabrication",
    };
    const result = checkCitations([], item);
    expect(result).toBe(true);
  });
});

describe("loadGolden", () => {
  it("returns an array of 50 items", async () => {
    const items = await loadGolden();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(50);
  });
});

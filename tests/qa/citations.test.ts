import { describe, expect, it } from "vitest";
import { isAllowedCitation, filterCitations } from "@/lib/qa/citations";

describe("isAllowedCitation", () => {
  it("gov.cn 域名通过", () => {
    expect(isAllowedCitation("https://www.shanghai.gov.cn/page")).toBe(true);
  });
  it("rsj.sh.gov.cn 子域通过", () => {
    expect(isAllowedCitation("https://www.rsj.sh.gov.cn/zhengce")).toBe(true);
  });
  it("huangpu.gov.cn 通过", () => {
    expect(isAllowedCitation("https://huangpu.gov.cn/x")).toBe(true);
  });
  it("zzjb.rsj.sh.gov.cn 通过", () => {
    expect(isAllowedCitation("https://zzjb.rsj.sh.gov.cn/y")).toBe(true);
  });
  it("外部域名拒绝", () => {
    expect(isAllowedCitation("https://example.com/x")).toBe(false);
  });
  it("javascript: 拒绝", () => {
    expect(isAllowedCitation("javascript:alert(1)")).toBe(false);
  });
  it("/wiki/policy/<slug> 通过", () => {
    expect(isAllowedCitation("/wiki/policy/unemployment-insurance")).toBe(true);
  });
  it("/wiki/biz/<slug>#anchor 通过", () => {
    expect(isAllowedCitation("/wiki/biz/startup-loan#part-1")).toBe(true);
  });
  it("非 policy/biz 的 /wiki/<x>/<slug> 拒绝", () => {
    expect(isAllowedCitation("/wiki/foo/bar")).toBe(false);
  });
  it("空字符串 / 非字符串拒绝", () => {
    expect(isAllowedCitation("")).toBe(false);
    // @ts-expect-error 故意传非 string
    expect(isAllowedCitation(null)).toBe(false);
  });
});

describe("filterCitations", () => {
  it("保留白名单内项，丢弃外部链接", () => {
    const r = filterCitations([
      "https://www.gov.cn/x",
      "/wiki/policy/abc",
      "https://example.com/x",
    ]);
    expect(r.kept).toEqual(["https://www.gov.cn/x", "/wiki/policy/abc"]);
    expect(r.dropped).toEqual(["https://example.com/x"]);
  });
  it("空数组返回空 kept/dropped", () => {
    expect(filterCitations([])).toEqual({ kept: [], dropped: [] });
  });
});

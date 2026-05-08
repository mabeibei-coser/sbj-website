/**
 * PIPL 数据流 E2E (T8 验证)
 *
 * 覆盖 INF-07 完整流程:
 * 1. consent (granted: true)
 * 2. consent 再次 (granted: false, 撤回)
 * 3. data/export 返回 citizen + 2 条 consent_records
 * 4. data/delete 真删
 * 5. data/export 再调 → 404
 *
 * NOTE: 需要本地起 Postgres + 设置 FIELD_ENCRYPTION_KEY。
 * 没起 DB 时此测试会全部失败 (说明 DB 配置缺失，是预期行为)。
 *
 * 跑前: docker compose up -d && npm run db:migrate
 */

import { test, expect } from "@playwright/test";

const TEST_PHONE = "13900000001"; // 11 位测试手机号

test.describe.serial("PIPL data lifecycle", () => {
  test.beforeAll(async ({ request }) => {
    // 清理: 删除可能残留的 test phone (上一轮 test 中断时未清)
    await request.post("/api/citizen/data/delete", {
      data: { phone: TEST_PHONE },
      failOnStatusCode: false, // 404 也接受
    });
  });

  test.afterAll(async ({ request }) => {
    await request.post("/api/citizen/data/delete", {
      data: { phone: TEST_PHONE },
      failOnStatusCode: false,
    });
  });

  test("1. consent granted=true 写入成功", async ({ request }) => {
    const res = await request.post("/api/citizen/consent", {
      data: { phone: TEST_PHONE, consentType: "qa", granted: true, version: "1.0" },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  test("2. consent 再次 granted=false (撤回)", async ({ request }) => {
    const res = await request.post("/api/citizen/consent", {
      data: { phone: TEST_PHONE, consentType: "qa", granted: false, version: "1.0" },
    });
    expect(res.status()).toBe(200);
  });

  test("3. GET consent 返回最新 (granted=false)", async ({ request }) => {
    const res = await request.get(`/api/citizen/consent?phone=${TEST_PHONE}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const qa = body.consents.find((c: { consentType: string }) => c.consentType === "qa");
    expect(qa).toBeTruthy();
    expect(qa.granted).toBe(false);
  });

  test("4. data/export 返回 2 条 consent_records", async ({ request }) => {
    const res = await request.post("/api/citizen/data/export", {
      data: { phone: TEST_PHONE },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.citizen.phone).toBe(TEST_PHONE);
    expect(body.consentRecords.length).toBe(2);
    expect(body.diagnosisRecords).toEqual([]);
    expect(body.serviceLogs).toEqual([]);
  });

  test("5. data/delete 真删", async ({ request }) => {
    const res = await request.post("/api/citizen/data/delete", {
      data: { phone: TEST_PHONE },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).deleted).toBe(true);
  });

  test("6. delete 后 export 返回 404", async ({ request }) => {
    const res = await request.post("/api/citizen/data/export", {
      data: { phone: TEST_PHONE },
    });
    expect(res.status()).toBe(404);
  });

  test("校验: 11 位手机号格式错误返回 400", async ({ request }) => {
    const res = await request.post("/api/citizen/consent", {
      data: { phone: "123", consentType: "qa", granted: true, version: "1.0" },
    });
    expect(res.status()).toBe(400);
  });
});

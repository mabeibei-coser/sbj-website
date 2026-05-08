/**
 * 市民档案 service 层 (CRM 主体的 CRUD 入口)
 *
 * - 自动加密 phone / name (调 lib/encryption.ts)
 * - 自动写 phone_hash (查询 + 唯一性约束 + PIPL 删除路径)
 * - PIPL 真删: deleteByPhone 走 prisma.delete() + onDelete:Cascade
 *
 * 业务模块统一从这里 CRUD CitizenProfile，不直接调 prisma.citizenProfile.*
 */

import "server-only";
import { prisma } from "@/lib/db";
import { encryptField, decryptField, hashField } from "@/lib/encryption";
import type { CitizenProfile } from "@prisma/client";

/**
 * 解密后的市民档案 (面向 admin 后台 / 数据导出)
 */
export interface CitizenWithPlain {
  id: string;
  phone: string;
  name: string | null;
  tier: string | null;
  tierAssignedAt: Date | null;
  tierAssignedBy: string | null;
  tierSource: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function decryptCitizen(c: CitizenProfile): CitizenWithPlain {
  return {
    id: c.id,
    phone: decryptField(c.phoneEncrypted),
    name: c.nameEncrypted ? decryptField(c.nameEncrypted) : null,
    tier: c.tier,
    tierAssignedAt: c.tierAssignedAt,
    tierAssignedBy: c.tierAssignedBy,
    tierSource: c.tierSource,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

/**
 * 按手机号查找。返回 null 表示不存在。
 */
export async function findCitizenByPhone(phone: string): Promise<CitizenWithPlain | null> {
  const phoneHash = hashField(phone);
  const c = await prisma.citizenProfile.findUnique({ where: { phoneHash } });
  return c ? decryptCitizen(c) : null;
}

/**
 * 找不到则创建 (upsert by phone_hash)。
 * Phase 1 没有 SMS 验证，仅按手机号建档案；Phase 2/3 加业务后会补验证。
 */
export async function findOrCreateCitizenByPhone(input: {
  phone: string;
  name?: string;
}): Promise<CitizenWithPlain> {
  const phoneHash = hashField(input.phone);
  const phoneEncrypted = encryptField(input.phone);
  const nameEncrypted = input.name ? encryptField(input.name) : undefined;

  const c = await prisma.citizenProfile.upsert({
    where: { phoneHash },
    create: {
      phoneHash,
      phoneEncrypted,
      nameEncrypted: nameEncrypted ?? null,
    },
    update: nameEncrypted
      ? { nameEncrypted } // 已存在时仅在传 name 时覆盖
      : {},
  });
  return decryptCitizen(c);
}

/**
 * PIPL 真删 (INF-07): 按手机号级联删除该市民全部数据。
 *
 * - 删 citizen_profiles 行 → 触发 Prisma 的 onDelete:Cascade
 *   连带 diagnosis_records / service_logs / consent_records 一起真删
 * - 不留软删除标记
 *
 * @returns 是否删除了行 (false = 该手机号本就不存在)
 */
export async function deleteCitizenByPhone(phone: string): Promise<boolean> {
  const phoneHash = hashField(phone);
  const result = await prisma.citizenProfile.deleteMany({ where: { phoneHash } });
  return result.count > 0;
}

/**
 * PIPL 数据导出 (INF-07): 返回该市民全部明文数据。
 *
 * - 解密 phone / name / 简历内容
 * - 关联诊断记录 + 服务记录 + 同意记录
 * - 没有该市民时返回 null
 */
export interface CitizenExport {
  citizen: CitizenWithPlain;
  diagnosisRecords: Array<{
    id: string;
    type: string;
    inputData: unknown;
    resumeContent: string | null;
    reportData: unknown;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  serviceLogs: Array<{
    id: string;
    staffId: string;
    serviceType: string;
    notes: string | null;
    createdAt: Date;
  }>;
  consentRecords: Array<{
    id: string;
    consentType: string;
    granted: boolean;
    version: string;
    createdAt: Date;
  }>;
}

export async function exportCitizenByPhone(phone: string): Promise<CitizenExport | null> {
  const phoneHash = hashField(phone);
  const c = await prisma.citizenProfile.findUnique({
    where: { phoneHash },
    include: {
      diagnosisRecords: { orderBy: { createdAt: "asc" } },
      serviceLogs: { orderBy: { createdAt: "asc" } },
      consentRecords: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!c) return null;

  return {
    citizen: decryptCitizen(c),
    diagnosisRecords: c.diagnosisRecords.map((d) => ({
      id: d.id,
      type: d.type,
      inputData: d.inputData,
      resumeContent: d.resumeContentEncrypted ? decryptField(d.resumeContentEncrypted) : null,
      reportData: d.reportData,
      status: d.status,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })),
    serviceLogs: c.serviceLogs.map((s) => ({
      id: s.id,
      staffId: s.staffId,
      serviceType: s.serviceType,
      notes: s.notes,
      createdAt: s.createdAt,
    })),
    consentRecords: c.consentRecords.map((cr) => ({
      id: cr.id,
      consentType: cr.consentType,
      granted: cr.granted,
      version: cr.version,
      createdAt: cr.createdAt,
    })),
  };
}

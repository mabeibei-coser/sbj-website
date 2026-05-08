-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "citizen_profiles" (
    "id" TEXT NOT NULL,
    "phone_encrypted" TEXT NOT NULL,
    "phone_hash" TEXT NOT NULL,
    "name_encrypted" TEXT,
    "tier" TEXT,
    "tier_assigned_at" TIMESTAMP(3),
    "tier_assigned_by" TEXT,
    "tier_source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "citizen_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnosis_records" (
    "id" TEXT NOT NULL,
    "citizen_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "input_data" JSONB,
    "resume_content_encrypted" TEXT,
    "report_data" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnosis_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_logs" (
    "id" TEXT NOT NULL,
    "citizen_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "service_type" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wiki_pages" (
    "id" TEXT NOT NULL,
    "kb_type" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source_url" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wiki_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wiki_page_versions" (
    "id" TEXT NOT NULL,
    "wiki_page_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content_snapshot" TEXT NOT NULL,
    "editor_id" TEXT,
    "diff_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wiki_page_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_call_logs" (
    "id" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "caller" TEXT NOT NULL,
    "prompt_hash" TEXT NOT NULL,
    "tokens_in" INTEGER NOT NULL DEFAULT 0,
    "tokens_out" INTEGER NOT NULL DEFAULT 0,
    "latency_ms" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "cost_cents" INTEGER NOT NULL DEFAULT 0,
    "is_fallback" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "citizen_id" TEXT,
    "citizen_phone_hash" TEXT,
    "consent_type" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "version" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "citizen_profiles_phone_hash_key" ON "citizen_profiles"("phone_hash");

-- CreateIndex
CREATE INDEX "citizen_profiles_tier_idx" ON "citizen_profiles"("tier");

-- CreateIndex
CREATE INDEX "citizen_profiles_created_at_idx" ON "citizen_profiles"("created_at");

-- CreateIndex
CREATE INDEX "diagnosis_records_citizen_id_idx" ON "diagnosis_records"("citizen_id");

-- CreateIndex
CREATE INDEX "diagnosis_records_type_status_idx" ON "diagnosis_records"("type", "status");

-- CreateIndex
CREATE INDEX "diagnosis_records_created_at_idx" ON "diagnosis_records"("created_at");

-- CreateIndex
CREATE INDEX "service_logs_citizen_id_idx" ON "service_logs"("citizen_id");

-- CreateIndex
CREATE INDEX "service_logs_staff_id_idx" ON "service_logs"("staff_id");

-- CreateIndex
CREATE INDEX "service_logs_created_at_idx" ON "service_logs"("created_at");

-- CreateIndex
CREATE INDEX "wiki_pages_kb_type_published_at_idx" ON "wiki_pages"("kb_type", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "wiki_pages_kb_type_slug_key" ON "wiki_pages"("kb_type", "slug");

-- CreateIndex
CREATE INDEX "wiki_page_versions_wiki_page_id_idx" ON "wiki_page_versions"("wiki_page_id");

-- CreateIndex
CREATE UNIQUE INDEX "wiki_page_versions_wiki_page_id_version_key" ON "wiki_page_versions"("wiki_page_id", "version");

-- CreateIndex
CREATE INDEX "audit_logs_actor_created_at_idx" ON "audit_logs"("actor", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "llm_call_logs_vendor_created_at_idx" ON "llm_call_logs"("vendor", "created_at");

-- CreateIndex
CREATE INDEX "llm_call_logs_status_created_at_idx" ON "llm_call_logs"("status", "created_at");

-- CreateIndex
CREATE INDEX "llm_call_logs_caller_created_at_idx" ON "llm_call_logs"("caller", "created_at");

-- CreateIndex
CREATE INDEX "consent_records_citizen_id_consent_type_idx" ON "consent_records"("citizen_id", "consent_type");

-- CreateIndex
CREATE INDEX "consent_records_citizen_phone_hash_idx" ON "consent_records"("citizen_phone_hash");

-- CreateIndex
CREATE INDEX "consent_records_created_at_idx" ON "consent_records"("created_at");

-- AddForeignKey
ALTER TABLE "diagnosis_records" ADD CONSTRAINT "diagnosis_records_citizen_id_fkey" FOREIGN KEY ("citizen_id") REFERENCES "citizen_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_logs" ADD CONSTRAINT "service_logs_citizen_id_fkey" FOREIGN KEY ("citizen_id") REFERENCES "citizen_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_page_versions" ADD CONSTRAINT "wiki_page_versions_wiki_page_id_fkey" FOREIGN KEY ("wiki_page_id") REFERENCES "wiki_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_citizen_id_fkey" FOREIGN KEY ("citizen_id") REFERENCES "citizen_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;


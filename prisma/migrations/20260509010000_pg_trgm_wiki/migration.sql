-- autoplan B1: pg_trgm 字符三元组扩展 + wiki_pages 内容 GIN 索引
-- 用于 lib/qa/retrieve.ts 的 word_similarity 中文检索
-- pg_trgm 是 PostgreSQL 标准扩展，无需额外安装包

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN 索引覆盖 title + content（合并列与 retrieve.ts 的 SQL 一致）
CREATE INDEX IF NOT EXISTS wiki_pages_content_trgm
  ON wiki_pages
  USING GIN ((title || ' ' || content) gin_trgm_ops);

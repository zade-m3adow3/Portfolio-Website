-- ═══════════════════════════════════════════════════════════════
-- Project Antigravity — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Prerequisites:
--   1. Enable the pgvector extension first (one-time):
--      Dashboard → Database → Extensions → search "vector" → enable
--   2. Then run this entire script.
-- ═══════════════════════════════════════════════════════════════

-- Enable pgvector (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- ───────────────────────────────────────────────────────────────
-- TABLE 1: thesis_chunks
-- Stores chunked thesis text + OpenAI / Gemini embeddings
-- Used for RAG (Retrieval-Augmented Generation) queries
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.thesis_chunks (
  id            uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter       text          NOT NULL,           -- e.g. "Chapter 3", "Appendix A"
  section_title text          NOT NULL,           -- e.g. "Theorem 3.1 — Oja++ Convergence"
  content_text  text          NOT NULL,           -- raw chunk text (300–800 tokens)
  embedding     vector(1536)  NOT NULL,           -- OpenAI text-embedding-3-small (1536-dim)
                                                  -- Use vector(768) for Gemini embeddings
  token_count   integer,
  created_at    timestamptz   DEFAULT now()
);

-- Index for fast ANN cosine similarity search
CREATE INDEX IF NOT EXISTS thesis_chunks_embedding_idx
  ON public.thesis_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ───────────────────────────────────────────────────────────────
-- TABLE 2: research_logs
-- Audit trail for all user interactions + research actions
-- Protected by Row Level Security
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.research_logs (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text        NOT NULL,  -- e.g. "query_thesis", "view_slide", "export_pdf"
  payload     jsonb,                 -- arbitrary structured data per action type
  ip_hash     text,                  -- hashed client IP (privacy-safe rate-limit audit)
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS research_logs_user_idx ON public.research_logs(user_id);
CREATE INDEX IF NOT EXISTS research_logs_created_idx ON public.research_logs(created_at DESC);

-- ───────────────────────────────────────────────────────────────
-- TABLE 3: thesis_versions
-- Version-controlled snapshots of thesis chapters
-- Allows diff-based change tracking over time
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.thesis_versions (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  version       text        NOT NULL,       -- semantic version e.g. "4.3.1"
  chapter       text        NOT NULL,
  section_title text,
  content_text  text        NOT NULL,
  diff_summary  text,                       -- human-readable summary of what changed
  author_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  is_published  boolean     DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS thesis_versions_chapter_idx ON public.thesis_versions(chapter);
CREATE INDEX IF NOT EXISTS thesis_versions_version_idx ON public.thesis_versions(version);

-- ───────────────────────────────────────────────────────────────
-- TABLE 4: query_sessions
-- Tracks RAG query sessions for analytics + abuse detection
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.query_sessions (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token  text        NOT NULL UNIQUE,
  question       text        NOT NULL,
  retrieved_ids  uuid[]      DEFAULT '{}',   -- which chunks were retrieved
  answer_preview text,                        -- first 200 chars of LLM answer
  latency_ms     integer,
  created_at     timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════

-- thesis_chunks: publicly readable (portfolio is public)
ALTER TABLE public.thesis_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "thesis_chunks_public_read" ON public.thesis_chunks
  FOR SELECT USING (true);

-- Only service_role (backend) can insert/update/delete chunks
CREATE POLICY "thesis_chunks_service_write" ON public.thesis_chunks
  FOR ALL USING (auth.role() = 'service_role');

-- research_logs: users see only their own rows; anon cannot read
ALTER TABLE public.research_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "research_logs_own_read" ON public.research_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "research_logs_service_insert" ON public.research_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

-- thesis_versions: anyone can read published; only service_role writes
ALTER TABLE public.thesis_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "thesis_versions_published_read" ON public.thesis_versions
  FOR SELECT USING (is_published = true);
CREATE POLICY "thesis_versions_service_write" ON public.thesis_versions
  FOR ALL USING (auth.role() = 'service_role');

-- query_sessions: public insert (anon users can start sessions); no reads
ALTER TABLE public.query_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "query_sessions_insert" ON public.query_sessions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "query_sessions_service_read" ON public.query_sessions
  FOR SELECT USING (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════
-- FUNCTION: match_thesis_chunks
-- Called by Edge Function to perform cosine similarity search
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.match_thesis_chunks(
  query_embedding vector(1536),
  match_count     int     DEFAULT 5,
  similarity_threshold float DEFAULT 0.70
)
RETURNS TABLE (
  id            uuid,
  chapter       text,
  section_title text,
  content_text  text,
  similarity    float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    tc.id,
    tc.chapter,
    tc.section_title,
    tc.content_text,
    1 - (tc.embedding <=> query_embedding) AS similarity
  FROM public.thesis_chunks tc
  WHERE 1 - (tc.embedding <=> query_embedding) > similarity_threshold
  ORDER BY tc.embedding <=> query_embedding
  LIMIT match_count;
$$;

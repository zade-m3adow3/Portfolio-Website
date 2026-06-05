-- ═══════════════════════════════════════════════════════════════
-- MIGRATION: Fix vector dimensions  1536 → 768
-- Run in: Supabase Dashboard → SQL Editor → New Query
--
-- Why: The original schema used vector(1536) for OpenAI embeddings.
--      The project now uses Gemini text-embedding-004 (768-dim).
--      pgvector does not support ALTER COLUMN for dimension changes,
--      so we drop and recreate the column + index + RPC function.
--
-- Safe to run even if the table is empty (all previous inserts
-- failed due to the same dimension mismatch).
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Drop the ANN index (required before altering the column)
DROP INDEX IF EXISTS public.thesis_chunks_embedding_idx;

-- Step 2: Drop the old 1536-dim embedding column
ALTER TABLE public.thesis_chunks DROP COLUMN IF EXISTS embedding;

-- Step 3: Add it back at 768 dimensions (Gemini text-embedding-004)
ALTER TABLE public.thesis_chunks ADD COLUMN embedding vector(768);

-- Step 4: Recreate ANN index for 768-dim cosine similarity
--         lists=10 is appropriate for a small corpus; increase to 100
--         once you have >10k rows.
CREATE INDEX thesis_chunks_embedding_idx
  ON public.thesis_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

-- Step 5: Recreate the RPC function with the correct 768-dim signature
CREATE OR REPLACE FUNCTION public.match_thesis_chunks(
  query_embedding      vector(768),
  match_count          int     DEFAULT 5,
  similarity_threshold float   DEFAULT 0.70
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

-- Verify the column was created correctly:
-- SELECT column_name, data_type, udt_name
-- FROM information_schema.columns
-- WHERE table_name = 'thesis_chunks' AND column_name = 'embedding';

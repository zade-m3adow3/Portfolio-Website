// supabase/edge-functions/query-thesis/index.ts
// Supabase Edge Function — runs on Deno at the edge (Supabase infra)
// Deploy with: supabase functions deploy query-thesis
//
// This function is called by api/query-thesis.js OR directly from the browser.
// It handles: embed → similarity search → LLM generation → return answer

import { serve }        from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Strict thesis AI system prompt ──────────────────────────
const SYSTEM_PROMPT = `You are an expert academic AI assistant integrated into a research portfolio. Your sole purpose is to answer user questions regarding the thesis: "The Post-Mitigated Abraxas Model (PMM) and APU-X Substrate."

You will be provided with retrieved context blocks directly from the thesis. You must adhere to the following strict rules:

Grounding: Base your answers exclusively on the provided context blocks. Do not introduce outside knowledge, SOTA comparisons, or external theories not mentioned in the text.

Tone: Maintain a highly academic, precise, and objective tone, reflecting the mathematical rigour of the paper.

Mathematical Accuracy: Use exact terminology from the thesis (e.g., "Quicksand Oja++", "Global Integrity Monitor", "Coaxial Heterogeneous Shielding"). Wrap all mathematical formulas and variables in standard LaTeX formatting using $ for inline and $$ for display equations.

Ignorance: If the provided context blocks do not contain the answer to the user's question, you must explicitly state: "The provided sections of the thesis do not contain information to answer this specific query." Do not attempt to guess.`;

// ── CORS headers ─────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { question } = await req.json();
    if (!question || typeof question !== 'string' || question.trim().length < 5) {
      return new Response(JSON.stringify({ error: 'Invalid question.' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

    // 1. Embed the question
    const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: question.trim() }),
    });
    if (!embedRes.ok) throw new Error(`Embed failed: ${await embedRes.text()}`);
    const { data: embedData } = await embedRes.json();
    const embedding: number[] = embedData[0].embedding;

    // 2. Cosine similarity search
    const { data: chunks, error: dbErr } = await supabase.rpc('match_thesis_chunks', {
      query_embedding: embedding,
      match_count: 5,
      similarity_threshold: 0.70,
    });
    if (dbErr) throw dbErr;

    if (!chunks || chunks.length === 0) {
      return new Response(JSON.stringify({
        answer: 'The provided sections of the thesis do not contain information to answer this specific query.',
        sources: [],
      }), { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }

    // 3. Build context
    const contextBlock = (chunks as any[])
      .map((c, i) => `[Context ${i + 1} — ${c.chapter} · ${c.section_title}]\n${c.content_text}`)
      .join('\n\n---\n\n');

    // 4. LLM generation
    const llmRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: `Here are the retrieved thesis sections:\n\n${contextBlock}\n\n---\n\nUser question: ${question.trim()}` },
        ],
        temperature: 0.2,
        max_tokens: 800,
      }),
    });
    if (!llmRes.ok) throw new Error(`LLM failed: ${await llmRes.text()}`);
    const llmJson = await llmRes.json();
    const answer: string = llmJson.choices[0].message.content;

    return new Response(JSON.stringify({
      answer,
      sources: (chunks as any[]).map(c => ({
        chapter: c.chapter,
        section: c.section_title,
        similarity: Math.round(c.similarity * 100) / 100,
      })),
    }), { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('[edge:query-thesis]', err);
    return new Response(JSON.stringify({ error: 'Internal error. Please try again.' }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});

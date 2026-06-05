// supabase/edge-functions/query-thesis/index.ts
// Supabase Edge Function using Google Gemini Free Tier

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SYSTEM_PROMPT = `You are an expert academic AI assistant integrated into a research portfolio. Your sole purpose is to answer user questions regarding the thesis: "The Post-Mitigated Abraxas Model (PMM) and APU-X Substrate."

Grounding: Base your answers exclusively on the provided context blocks. Do not introduce outside knowledge.
Tone: Maintain a highly academic, precise, and objective tone.
Mathematical Accuracy: Use exact terminology from the thesis. Wrap all mathematical formulas in standard LaTeX formatting ($ for inline, $$ for display).
Ignorance: If the context blocks do not contain the answer, explicitly state: "The provided sections of the thesis do not contain information to answer this specific query."`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }});

  try {
    const { question } = await req.json();
    if (!question || typeof question !== 'string' || question.trim().length < 5) {
      return new Response(JSON.stringify({ error: 'Invalid question.' }), { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }});
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const geminiKey = Deno.env.get('GEMINI_API_KEY')!;

    // 1. Embed Question (gemini-embedding-2)
    const embedUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${geminiKey}`;
    const embedRes = await fetch(embedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'models/gemini-embedding-2', content: { parts: [{ text: question.trim() }] }, outputDimensionality: 768 }),
    });
    if (!embedRes.ok) throw new Error(`Embed failed: ${await embedRes.text()}`);
    const embedJson = await embedRes.json();
    const embedding: number[] = embedJson.embedding.values; // 768 dims

    // 2. Search Supabase
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

    // 3. Generate Answer (Gemini 1.5 Flash)
    const contextBlock = (chunks as any[]).map((c, i) => `[Context ${i + 1} — ${c.chapter}]\n${c.content_text}`).join('\n\n---\n\n');
    const userMessage = `Here are the retrieved thesis sections:\n\n${contextBlock}\n\n---\n\nUser question: ${question.trim()}`;
    
    const llmUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
    const llmRes = await fetch(llmUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 800 }
      }),
    });
    
    if (!llmRes.ok) throw new Error(`LLM failed: ${await llmRes.text()}`);
    const llmJson = await llmRes.json();
    const answer: string = llmJson.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({
      answer,
      sources: (chunks as any[]).map(c => ({ chapter: c.chapter, section: c.section_title, similarity: Math.round(c.similarity * 100) / 100 })),
    }), { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('[edge:query-thesis-gemini]', err);
    return new Response(JSON.stringify({ error: 'Internal error. Please try again.' }), { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }});
  }
});

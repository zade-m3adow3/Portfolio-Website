// api/query-thesis.js
// Vercel Serverless Function — RAG query endpoint using Google Gemini (Free Tier)
// POST /api/query-thesis

import { supabaseAdmin } from './_lib/supabase.js';
import { checkRateLimit } from './_lib/rateLimit.js';

let Sentry;
try {
  Sentry = await import('@sentry/node');
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.VERCEL_ENV || 'development',
      tracesSampleRate: 0.2,
    });
  }
} catch { /* optional fallback */ }

const SYSTEM_PROMPT = `You are an expert academic AI assistant integrated into a research portfolio. Your sole purpose is to answer user questions regarding the thesis: "The Post-Mitigated Abraxas Model (PMM) and APU-X Substrate."

Grounding: Base your answers exclusively on the provided context blocks. Do not introduce outside knowledge.
Tone: Maintain a highly academic, precise, and objective tone.
Mathematical Accuracy: Use exact terminology from the thesis. Wrap all mathematical formulas in standard LaTeX formatting ($ for inline, $$ for display).
Ignorance: If the context blocks do not contain the answer, explicitly state: "The provided sections of the thesis do not contain information to answer this specific query."`;

async function embedQuestion(question) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  // text-embedding-004: stable free-tier model, outputs 768 dims natively
  const model = 'text-embedding-004';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${model}`,
      content: { parts: [{ text: question }] },
    }),
  });

  if (!res.ok) throw new Error(`Gemini embed failed: ${await res.text()}`);
  const json = await res.json();
  return json.embedding.values;
}

async function generateAnswer(question, chunks) {
  const contextBlock = chunks
    .map((c, i) => `[Context ${i + 1} — ${c.chapter} · ${c.section_title}]\n${c.content_text}`)
    .join('\n\n---\n\n');

  const userMessage = `Here are the retrieved thesis sections:\n\n${contextBlock}\n\n---\n\nUser question: ${question}`;
  const apiKey = process.env.GEMINI_API_KEY;
  // gemini-2.0-flash confirmed available for this API key (gemini-1.5-flash is not)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 800 }
    }),
  });

  if (!res.ok) throw new Error(`Gemini LLM failed: ${await res.text()}`);
  const json = await res.json();
  return json.candidates[0].content.parts[0].text;
}

export default async function handler(req, res) {
  const transaction = Sentry?.startTransaction({ name: 'query-thesis-gemini', op: 'http' });

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const rl = await checkRateLimit(req);
    res.setHeader('X-RateLimit-Limit', '10');
    res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(rl.resetAt / 1000)));

    if (!rl.allowed) {
      return res.status(429).json({ error: 'Too many requests.', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) });
    }

    const { question } = req.body || {};
    if (!question || typeof question !== 'string' || question.trim().length < 5) {
      return res.status(400).json({ error: 'Provide a valid question.' });
    }

    const q = question.trim();
    const t0 = Date.now();

    const embedding = await embedQuestion(q);
    const { data: chunks, error: dbErr } = await supabaseAdmin.rpc(
      'match_thesis_chunks',
      // threshold 0.40 — balanced; higher values return zero results
      { query_embedding: embedding, match_count: 5, similarity_threshold: 0.40 }
    );
    if (dbErr) throw dbErr;

    if (!chunks || chunks.length === 0) {
      return res.status(200).json({
        answer: 'The provided sections of the thesis do not contain information to answer this specific query.',
        sources: [],
      });
    }

    const answer = await generateAnswer(q, chunks);
    const latency = Date.now() - t0;

    supabaseAdmin.from('query_sessions').insert({
      session_token: crypto.randomUUID(),
      question: q,
      retrieved_ids: chunks.map(c => c.id),
      answer_preview: answer.slice(0, 200),
      latency_ms: latency,
    }).then().catch(console.error);

    return res.status(200).json({
      answer,
      sources: chunks.map(c => ({
        chapter: c.chapter,
        section: c.section_title,
        similarity: Math.round(c.similarity * 100) / 100,
      })),
      latency_ms: latency,
    });

  } catch (err) {
    Sentry?.captureException(err);
    console.error('[query-thesis]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  } finally {
    transaction?.finish();
  }
}

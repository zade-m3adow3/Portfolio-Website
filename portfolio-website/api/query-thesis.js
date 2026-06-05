// api/query-thesis.js
// Vercel Serverless Function — RAG query endpoint
// POST /api/query-thesis
// Body: { "question": "What is the GIM eigengap?" }
// Returns: { "answer": "...", "sources": [...] }

import { supabaseAdmin } from './_lib/supabase.js';
import { checkRateLimit } from './_lib/rateLimit.js';

// ── Sentry (initialise once per cold start) ─────────────────
let Sentry;
try {
  Sentry = await import('@sentry/node');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,  // set in Vercel env vars
    environment: process.env.VERCEL_ENV || 'development',
    tracesSampleRate: 0.2,
  });
} catch { /* Sentry optional — works without it */ }

// ── AI System Prompt (strict thesis grounding) ───────────────
const SYSTEM_PROMPT = `You are an expert academic AI assistant integrated into a research portfolio. Your sole purpose is to answer user questions regarding the thesis: "The Post-Mitigated Abraxas Model (PMM) and APU-X Substrate."

You will be provided with retrieved context blocks directly from the thesis. You must adhere to the following strict rules:

**Grounding:** Base your answers exclusively on the provided context blocks. Do not introduce outside knowledge, SOTA comparisons, or external theories not mentioned in the text.

**Tone:** Maintain a highly academic, precise, and objective tone, reflecting the mathematical rigour of the paper.

**Mathematical Accuracy:** Use exact terminology from the thesis (e.g., "Quicksand Oja++", "Global Integrity Monitor", "Coaxial Heterogeneous Shielding"). Wrap all mathematical formulas and variables in standard LaTeX formatting using $ for inline and $$ for display equations.

**Ignorance:** If the provided context blocks do not contain the answer to the user's question, you must explicitly state: "The provided sections of the thesis do not contain information to answer this specific query." Do not attempt to guess.`;

// ── Embed the user question ──────────────────────────────────
async function embedQuestion(question) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: question,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embedding failed: ${err}`);
  }

  const json = await res.json();
  return json.data[0].embedding;  // float[1536]
}

// ── Call LLM with retrieved context ─────────────────────────
async function generateAnswer(question, chunks) {
  const contextBlock = chunks
    .map((c, i) =>
      `[Context ${i + 1} — ${c.chapter} · ${c.section_title}]\n${c.content_text}`
    )
    .join('\n\n---\n\n');

  const userMessage =
    `Here are the retrieved thesis sections:\n\n${contextBlock}\n\n---\n\nUser question: ${question}`;

  const apiKey = process.env.OPENAI_API_KEY;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userMessage },
      ],
      temperature: 0.2,
      max_tokens: 800,
    }),
  });

  if (!res.ok) throw new Error(`LLM call failed: ${await res.text()}`);
  const json = await res.json();
  return json.choices[0].message.content;
}

// ── Main handler ─────────────────────────────────────────────
export default async function handler(req, res) {
  const transaction = Sentry?.startTransaction({ name: 'query-thesis', op: 'http' });

  try {
    // Method guard
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate limit
    const rl = await checkRateLimit(req);
    res.setHeader('X-RateLimit-Limit', '10');
    res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(rl.resetAt / 1000)));

    if (!rl.allowed) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment before querying again.',
        retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000),
      });
    }

    // Validate body
    const { question } = req.body || {};
    if (!question || typeof question !== 'string' || question.trim().length < 5) {
      return res.status(400).json({ error: 'Provide a question with at least 5 characters.' });
    }
    if (question.length > 500) {
      return res.status(400).json({ error: 'Question too long (max 500 chars).' });
    }

    const q = question.trim();
    const t0 = Date.now();

    // 1. Embed the question
    const embedding = await embedQuestion(q);

    // 2. Cosine similarity search in Supabase
    const { data: chunks, error: dbErr } = await supabaseAdmin.rpc(
      'match_thesis_chunks',
      { query_embedding: embedding, match_count: 5, similarity_threshold: 0.70 }
    );
    if (dbErr) throw dbErr;

    if (!chunks || chunks.length === 0) {
      return res.status(200).json({
        answer: 'The provided sections of the thesis do not contain information to answer this specific query.',
        sources: [],
      });
    }

    // 3. Generate answer
    const answer = await generateAnswer(q, chunks);
    const latency = Date.now() - t0;

    // 4. Log session (fire-and-forget, non-blocking)
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
    return res.status(500).json({ error: 'Internal server error. Please try again.' });
  } finally {
    transaction?.finish();
  }
}

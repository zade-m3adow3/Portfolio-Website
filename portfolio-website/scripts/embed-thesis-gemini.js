// scripts/embed-thesis-gemini.js
// Embeds the thesis PDF into Supabase using Gemini text-embedding-004 (768-dim)
// Run once from portfolio-website/ directory:
//   node scripts/embed-thesis-gemini.js

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF_PATH = path.join(__dirname, '..', 'Final_AGI_Thesis.pdf');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Gemini Embedding 2 via REST API (768-dim output) ─────────
const EMBED_MODEL = 'gemini-embedding-2';

async function embedText(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env.local');

  const url = `https://generativelanguage.googleapis.com/v1/models/${EMBED_MODEL}:embedContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text }] },
      outputDimensionality: 768,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini embed failed (${res.status}): ${err}`);
  }

  const json = await res.json();
  return json.embedding.values; // 768-dim float array
}

function chunkText(text, chunkSize = 600, overlap = 80) {
  const words = text.split(/\s+/);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    chunks.push(words.slice(i, i + chunkSize).join(' '));
    i += chunkSize - overlap;
  }
  return chunks;
}

function detectChapter(text) {
  const match =
    text.match(/Chapter\s+(\d+)/i) ||
    text.match(/Appendix\s+([A-Z])/i) ||
    text.match(/§\s*([\d.]+)/);
  return match ? match[0] : 'General';
}

async function main() {
  console.log('📄 Reading thesis PDF...');
  const pdfBuffer = fs.readFileSync(PDF_PATH);
  const { text } = await pdfParse(pdfBuffer);

  const rawChunks = chunkText(text, 600, 80);
  console.log(`✂️  Split into ${rawChunks.length} chunks`);

  console.log('🗑️  Clearing old chunks from database...');
  const { error: deleteErr } = await supabase
    .from('thesis_chunks')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows
  if (deleteErr) {
    console.error('❌ Failed to clear old chunks:', deleteErr.message);
    process.exit(1);
  }

  let uploaded = 0;
  let skipped = 0;

  for (let i = 0; i < rawChunks.length; i++) {
    let content = rawChunks[i].trim().replace(/\x00/g, ''); // strip null bytes
    if (content.length < 50) { skipped++; continue; }

    process.stdout.write(`\r⚡ Embedding chunk ${i + 1}/${rawChunks.length} (uploaded: ${uploaded}, skipped: ${skipped})...`);

    try {
      const embedding = await embedText(content);

      const { error } = await supabase.from('thesis_chunks').insert({
        chapter: detectChapter(content),
        section_title: content.slice(0, 80).replace(/\n/g, ' '),
        content_text: content,
        embedding,           // 768-dim — matches vector(768) column
        token_count: content.split(/\s+/).length,
      });

      if (error) {
        console.error(`\n❌ DB insert error (chunk ${i + 1}):`, error.message);
      } else {
        uploaded++;
      }

      // Gemini free tier: 1,500 RPM for text-embedding-004
      // 50ms delay is enough; increase to 500ms if you hit quota errors
      await new Promise(r => setTimeout(r, 50));

    } catch (err) {
      console.error(`\n❌ Embed error (chunk ${i + 1}):`, err.message);
      // Back off on API errors
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`\n\n✅ Done! Uploaded ${uploaded} chunks, skipped ${skipped} short chunks.`);
}

main().catch(console.error);

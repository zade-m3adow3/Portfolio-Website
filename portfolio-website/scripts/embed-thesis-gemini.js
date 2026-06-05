import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF_PATH = 'C:\\Users\\rovim\\.gemini\\antigravity\\scratch\\Portfolio-Website\\portfolio-website\\assets\\simulations\\spice\\Final_AGI_Thesis.pdf';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
  const match = text.match(/Chapter\s+(\d+)/i) || text.match(/Appendix\s+([A-Z])/i) || text.match(/§\s*([\d.]+)/);
  return match ? match[0] : 'General';
}

async function main() {
  console.log('📄 Reading thesis PDF...');
  const pdfBuffer = fs.readFileSync(PDF_PATH);
  const { text } = await pdfParse(pdfBuffer);
  
  const rawChunks = chunkText(text, 600, 80);
  console.log(`✂️  Split into ${rawChunks.length} chunks`);

  let uploaded = 0;
  for (let i = 0; i < rawChunks.length; i++) {
    const content = rawChunks[i].trim();
    if (content.length < 50) continue;

    process.stdout.write(`\r⚡ Embedding chunk ${i + 1}/${rawChunks.length}...`);

    try {
      // Free Gemini Embedding (gemini-embedding-2 configured to 768 dims)
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-2',
        contents: content,
        config: {
          outputDimensionality: 768
        }
      });
      const embedding = response.embeddings[0].values;

      const { error } = await supabase.from('thesis_chunks').insert({
        chapter: detectChapter(content),
        section_title: content.slice(0, 80).replace(/\n/g, ' '),
        content_text: content,
        embedding,
        token_count: content.split(/\s+/).length,
      });

      if (error) console.error(`\n❌ DB Error:`, error.message);
      else uploaded++;

      // Sleep to respect Gemini's 15 requests/minute free tier limit
      // 15 requests / 60 seconds = 1 request every 4 seconds.
      await new Promise(r => setTimeout(r, 4500));

    } catch (err) {
      console.error(`\n❌ API Error:`, err.message);
    }
  }
  console.log(`\n\n✅ Done! Uploaded ${uploaded} chunks.`);
}

main().catch(console.error);

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function main() {
  try {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: "Test content",
      config: {
        outputDimensionality: 768
      }
    });
    console.log("Dimension size:", response.embeddings[0].values.length);
  } catch (err) {
    console.error(err);
  }
}

main();

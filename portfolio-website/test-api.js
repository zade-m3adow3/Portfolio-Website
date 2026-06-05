import fetch from 'node-fetch';

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("Using API key:", apiKey ? "Set" : "Not Set");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/gemini-embedding-2',
      content: { parts: [{ text: "test question" }] },
      outputDimensionality: 768
    }),
  });

  console.log(res.status, await res.text());
}

test();

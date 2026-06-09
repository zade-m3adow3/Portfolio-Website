const apiKey = 'AIzaSyCr0VccGS1jxd6A2ltcoiZI2mXztuZjjEc';
const SYSTEM_PROMPT = 'You are an expert academic AI assistant...';
const userMessage = 'Explain APU-X';
const GENERATION_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'];

async function test() {
  for (const model of GENERATION_MODELS) {
    console.log('Testing', model);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 800 },
        }),
      });
      console.log('Status:', res.status);
      const text = await res.text();
      console.log('Body:', text.substring(0, 300));
    } catch (err) {
      console.error('Error:', err);
    }
  }
}
test();

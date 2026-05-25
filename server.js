const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Try models in order until one works
const MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.0-pro',
  'gemini-pro'
];

async function tryGemini(prompt, modelName) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2000, temperature: 0.7 }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `Error with ${modelName}`);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error('Empty response');
  return text;
}

app.post('/api/generate', async (req, res) => {
  const { system, messages } = req.body;
  const prompt = (system ? system + '\n\n' : '') + messages.map(m => m.content).join('\n');

  let lastError = '';
  for (const model of MODELS) {
    try {
      const text = await tryGemini(prompt, model);
      return res.json({ content: [{ type: 'text', text }] });
    } catch (err) {
      lastError = err.message;
      console.log(`Model ${model} failed: ${err.message}`);
    }
  }
  res.status(500).json({ error: { message: 'All models failed: ' + lastError } });
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', key_set: !!process.env.GEMINI_API_KEY }));

app.listen(process.env.PORT || 3000, () => console.log('Proxy running'));

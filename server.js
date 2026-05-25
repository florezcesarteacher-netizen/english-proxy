const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const FREE_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'deepseek/deepseek-v4-flash:free',
  'openrouter/owl-alpha'
];

async function tryModel(model, system, messages) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://netlify.app',
      'X-Title': 'English Exercise Generator'
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        ...messages
      ],
      max_tokens: 2000
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `${model} failed`);
  const text = data.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('Empty response');
  return text;
}

app.post('/api/generate', async (req, res) => {
  const { system, messages } = req.body;
  let lastError = '';
  for (const model of FREE_MODELS) {
    try {
      console.log(`Trying model: ${model}`);
      const text = await tryModel(model, system, messages);
      console.log(`Success with: ${model}`);
      return res.json({ content: [{ type: 'text', text }] });
    } catch (err) {
      lastError = err.message;
      console.log(`Failed ${model}: ${err.message}`);
    }
  }
  res.status(500).json({ error: { message: lastError } });
});

app.get('/health', (req, res) => res.json({
  status: 'ok',
  key_set: !!process.env.OPENROUTER_API_KEY,
  models: FREE_MODELS
}));

app.listen(process.env.PORT || 3000, () => console.log('Proxy running'));

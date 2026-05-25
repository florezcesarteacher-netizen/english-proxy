const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/generate', async (req, res) => {
  try {
    const { system, messages } = req.body;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://english-exercise-generator.netlify.app',
        'X-Title': 'English Exercise Generator'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-8b-instruct:free',
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          ...messages
        ],
        max_tokens: 2000
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'OpenRouter error');

    const text = data.choices?.[0]?.message?.content || '';
    res.json({ content: [{ type: 'text', text }] });

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: { message: err.message } });
  }
});

app.get('/health', (req, res) => res.json({ 
  status: 'ok', 
  key_set: !!process.env.OPENROUTER_API_KEY 
}));

app.listen(process.env.PORT || 3000, () => console.log('Proxy running with OpenRouter'));

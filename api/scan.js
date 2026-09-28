module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server is missing GROQ_API_KEY' });

  const text = String((req.body && req.body.text) || '').trim().slice(0, 6000);
  if (!text) return res.status(400).json({ error: 'No text provided' });

  const prompt = `You are a consumer-protection dark-pattern detector. Analyze the checkout/subscription text below and return ONLY valid JSON in this exact format:
{"riskScore": <integer 0-100>, "siteGuess": "<what kind of service, 2-4 words>", "flags": [{"type": "<short pattern name>", "severity": "high" or "medium" or "low", "explanation": "<1 sentence>", "remedy": "<how to fix/avoid>"}]}

Text to analyze:
"""${text}"""`;

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      })
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(502).json({ error: (data.error && data.error.message) || 'AI service error' });
    }

    const raw = data.choices[0].message.content;
    const result = JSON.parse(raw);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Takes pasted text and asks an AI model to find dark patterns.
// Tries several models in order, so if one is busy the next one takes over.

function buildPrompt(text) {
  return `You are a consumer-protection dark-pattern detector. Analyze the checkout/subscription/terms text below and return ONLY JSON with this exact shape:
{"riskScore": <integer 0-100>, "siteGuess": "<what kind of service, 2-4 words>", "flags": [{"type": "<short pattern name>", "severity": "high" or "medium", "description": "<one plain-English sentence>"}], "disputeEmail": "<ready-to-send email asking to cancel and refund, mentions the specific hidden terms found, professional, under 150 words>"}
Text to analyze:
"""${text}"""`;
}

async function timedFetch(url, options, ms) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: c.signal });
  } finally {
    clearTimeout(t);
  }
}

async function callGemini(model, prompt) {
  const r = await timedFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    },
    9000
  );
  if (!r.ok) throw new Error(String(r.status));
  const data = await r.json();
  return data.candidates[0].content.parts.map(p => p.text || '').join('');
}

async function callGroq(model, prompt) {
  const r = await timedFetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.GROQ_API_KEY },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      })
    },
    9000
  );
  if (!r.ok) throw new Error(String(r.status));
  const data = await r.json();
  return data.choices[0].message.content;
}

function parseResult(raw) {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  const o = JSON.parse(raw.slice(start, end + 1));
  o.riskScore = Math.max(0, Math.min(100, Math.round(Number(o.riskScore) || 0)));
  o.siteGuess = String(o.siteGuess || 'Unknown service').slice(0, 60);
  o.flags = Array.isArray(o.flags) ? o.flags.slice(0, 8) : [];
  o.disputeEmail = String(o.disputeEmail || '');
  return o;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const text = String((req.body && req.body.text) || '').trim().slice(0, 6000);
  if (!text) return res.status(400).json({ error: 'No text provided' });

      const attempts = [];
  if (process.env.GROQ_API_KEY) {
    const groqModels = ['openai/gpt-oss-120b', 'qwen/qwen3.6-27b', 'openai/gpt-oss-20b'];
    if (process.env.GROQ_MODEL) groqModels.unshift(process.env.GROQ_MODEL);
    for (const m of groqModels) attempts.push(['groq ' + m, callGroq, m]);
  }
  if (process.env.GEMINI_API_KEY) {
    const geminiModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
    if (process.env.GEMINI_MODEL) geminiModels.unshift(process.env.GEMINI_MODEL);
    for (const m of geminiModels) attempts.push(['gemini ' + m, callGemini, m]);
  }
  if (!attempts.length) {
    return res.status(500).json({ error: 'No AI key set. Add GEMINI_API_KEY or GROQ_API_KEY in Vercel.' });
  }

  const prompt = buildPrompt(text);
  const failures = [];
  for (const [label, fn, model] of attempts) {
    try {
      const raw = await fn(model, prompt);
      return res.status(200).json(parseResult(raw));
    } catch (e) {
      failures.push(label + ': ' + (e.name === 'AbortError' ? 'timeout' : e.message));
    }
  }
  return res.status(502).json({ error: 'AI is busy right now, please try again. (' + failures.join('; ') + ')' });
};

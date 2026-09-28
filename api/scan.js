// Takes pasted text, asks Gemini to find dark patterns, returns a score + flags + email.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY' });

  const text = String((req.body && req.body.text) || '').trim().slice(0, 6000);
  if (!text) return res.status(400).json({ error: 'No text provided' });

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const prompt = `You are a consumer-protection dark-pattern detector. Analyze the checkout/subscription/terms text below and return ONLY JSON with this exact shape:
{"riskScore": <integer 0-100>, "siteGuess": "<what kind of service, 2-4 words>", "flags": [{"type": "<short pattern name>", "severity": "high" or "medium", "description": "<one plain-English sentence>"}], "disputeEmail": "<ready-to-send email asking to cancel and refund, mentions the specific hidden terms found, professional, under 150 words>"}
Text to analyze:
"""${text}"""`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );
    const data = await r.json();
    if (!r.ok) {
      return res.status(502).json({ error: (data.error && data.error.message) || 'AI service error' });
    }
    const raw = data.candidates[0].content.parts.map(p => p.text || '').join('');
    const result = JSON.parse(raw.replace(/```json|```/g, '').trim());
    result.riskScore = Math.max(0, Math.min(100, Math.round(Number(result.riskScore) || 0)));
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: 'Could not analyze that text. Try again.' });
  }
};

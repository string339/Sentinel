// GET  -> latest reports from the database
// POST -> save a new report to the database
const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_KEY || '';

function headers() {
  const h = { apikey: key, 'Content-Type': 'application/json' };
  if (!key.startsWith('sb_')) h.Authorization = 'Bearer ' + key; // legacy JWT keys need this
  return h;
}

module.exports = async (req, res) => {
  if (!base || !key) return res.status(500).json({ error: 'Database is not configured' });
  try {
    if (req.method === 'GET') {
      const r = await fetch(
        `${base}/rest/v1/reports?select=site_guess,risk_score,top_flag,created_at&order=created_at.desc&limit=8`,
        { headers: headers() }
      );
      if (!r.ok) return res.status(502).json({ error: 'Database read failed' });
      return res.status(200).json(await r.json());
    }
    if (req.method === 'POST') {
      const b = req.body || {};
      const row = {
        site_guess: String(b.siteGuess || 'Unknown service').slice(0, 60),
        risk_score: Math.max(0, Math.min(100, Math.round(Number(b.riskScore) || 0))),
        top_flag: String(b.topFlag || 'Dark pattern').slice(0, 80)
      };
      const r = await fetch(`${base}/rest/v1/reports`, {
        method: 'POST',
        headers: { ...headers(), Prefer: 'return=minimal' },
        body: JSON.stringify(row)
      });
      if (!r.ok) return res.status(502).json({ error: 'Database write failed' });
      return res.status(201).json({ ok: true });
    }
    return res.status(405).json({ error: 'GET or POST only' });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
};

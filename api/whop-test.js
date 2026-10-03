export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const apiKey = process.env.WHOP_COMPANY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      connected: false,
      error: "WHOP_COMPANY_API_KEY is not configured"
    });
  }

  try {
    const response = await fetch("https://api.whop.com/api/v1/me", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; }

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        connected: false,
        whop: data
      });
    }

    return res.status(200).json({
      ok: true,
      connected: true,
      whop: data
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      connected: false,
      error: "Whop request failed"
    });
  }
}

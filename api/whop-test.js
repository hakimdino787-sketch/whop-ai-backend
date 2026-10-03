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
    // Company API keys are company-scoped. /me is not a valid Whop REST endpoint.
    // Listing products is a safe read-only connectivity test.
    const response = await fetch("https://api.whop.com/api/v1/products", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Api-Version-Date": "2026-06-09"
      }
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text.slice(0, 500) };
    }

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
      test: "products",
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

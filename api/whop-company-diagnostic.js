export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const companyId = String(req.query?.company_id || "").trim();

  if (!/^biz_[A-Za-z0-9]+$/.test(companyId)) {
    return res.status(400).json({
      ok: false,
      error: "A valid Whop Company ID in biz_... format is required"
    });
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
    const response = await fetch(
      `https://api.whop.com/api/v1/products?company_id=${encodeURIComponent(companyId)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Api-Version-Date": "2026-06-09"
        }
      }
    );

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
        company_id: companyId,
        whop: data
      });
    }

    const items = Array.isArray(data?.data) ? data.data : [];
    const companies = [...new Set(
      items.map(item => item?.company?.id).filter(Boolean)
    )];

    return res.status(200).json({
      ok: true,
      connected: true,
      company_id: companyId,
      matched_company_ids: companies,
      product_count: items.length,
      company_match: companies.includes(companyId),
      diagnostic: "read_only"
    });
  } catch {
    return res.status(502).json({
      ok: false,
      connected: false,
      error: "Whop request failed"
    });
  }
}

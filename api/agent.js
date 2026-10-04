function scoreProduct(p) {
  const text = JSON.stringify(p).toLowerCase();
  let score = 0;
  const reasons = [];
  if (text.includes("ai") || text.includes("automation")) { score += 25; reasons.push("AI/automation demand signal"); }
  if (text.includes("toolkit") || text.includes("guide") || text.includes("playbook")) { score += 15; reasons.push("Easy-to-explain digital product"); }
  const price = Number(p?.price ?? p?.amount ?? p?.initial_price ?? 0);
  if (price >= 10 && price <= 100) { score += 20; reasons.push("Accessible price range"); }
  if (price > 100) { score += 10; reasons.push("Higher-value offer"); }
  if (p?.status === "active" || p?.active === true) { score += 15; reasons.push("Appears active"); }
  return { score: Math.min(score, 100), reasons };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok:false, error:"Method not allowed" });

  const apiKey = process.env.WHOP_COMPANY_API_KEY;
  if (!apiKey) return res.status(500).json({ ok:false, error:"WHOP_COMPANY_API_KEY is not configured" });

  try {
    const response = await fetch("https://api.whop.com/api/v1/products", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Api-Version-Date": "2026-06-09"
      }
    });
    const body = await response.text();
    let data;
    try { data = JSON.parse(body); } catch { data = { raw: body }; }
    if (!response.ok) return res.status(response.status).json({ ok:false, error:"Whop API request failed", whop:data });

    const items = Array.isArray(data) ? data : (data?.data || data?.products || []);
    const ranked = items.map((p) => ({ product:p, ...scoreProduct(p) }))
      .sort((a,b) => b.score - a.score);

    return res.status(200).json({
      ok:true,
      agent:"BEN AI",
      mode:"opportunity-ranking",
      generatedAt:new Date().toISOString(),
      count:ranked.length,
      recommendations:ranked.slice(0,10),
      nextStep:"Use the highest-ranked offer for content/traffic experiments; do not spend money automatically."
    });
  } catch (error) {
    return res.status(502).json({ ok:false, error:"Agent request failed" });
  }
}

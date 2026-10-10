function getProductPrice(p) {
  const raw =
    p?.default_plan?.initial_price?.amount ??
    p?.default_plan?.price?.amount ??
    p?.initial_price?.amount ??
    p?.price?.amount ??
    p?.price ??
    p?.amount;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function scoreProduct(p) {
  const text = [
    p?.title,
    p?.headline,
    p?.description,
    ...(Array.isArray(p?.labels) ? p.labels : [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;
  const reasons = [];
  const price = getProductPrice(p);

  if (/\b(ai|artificial intelligence|automation|automated)\b/.test(text)) {
    score += 25;
    reasons.push("AI/automation is explicitly mentioned");
  }

  if (/\b(toolkit|guide|playbook|template|bundle|course|ebook|e-book|planner|checklist|prompt pack)\b/.test(text)) {
    score += 15;
    reasons.push("Clear digital-product format");
  }

  if (price !== null) {
    if (price >= 5 && price <= 50) {
      score += 20;
      reasons.push("Accessible one-time price ($5–$50)");
    } else if (price > 50 && price <= 150) {
      score += 15;
      reasons.push("Mid-range price ($50–$150)");
    } else if (price > 150) {
      score += 8;
      reasons.push("Higher-priced offer");
    } else if (price === 0) {
      reasons.push("Free offer; monetization potential needs separate review");
    }
  }

  if (p?.visibility === "visible") {
    score += 10;
    reasons.push("Product is marked visible");
  }

  const reviews = Number(p?.published_reviews_count ?? 0);
  const rating = Number(p?.average_review_rating ?? 0);
  if (reviews > 0 && rating >= 4) {
    score += 10;
    reasons.push("Positive rating with published reviews");
  } else if (reviews > 0) {
    score += 4;
    reasons.push("Has published reviews");
  }

  const members = Number(p?.member_count ?? 0);
  if (members > 0) {
    score += Math.min(10, Math.ceil(Math.log10(members + 1) * 4));
    reasons.push("Has existing members");
  }

  return {
    score: Math.min(score, 100),
    price,
    currency: p?.default_plan?.initial_price?.currency ?? null,
    reasons
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const apiKey = process.env.WHOP_COMPANY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: "WHOP_COMPANY_API_KEY is not configured" });
  }

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
    try {
      data = JSON.parse(body);
    } catch {
      data = { raw: body };
    }

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: "Whop API request failed",
        whop: data
      });
    }

    const items = Array.isArray(data) ? data : (data?.data || data?.products || []);
    const ranked = items
      .map((product) => ({ product, ...scoreProduct(product) }))
      .sort((a, b) => b.score - a.score);

    return res.status(200).json({
      ok: true,
      agent: "BEN AI",
      mode: "opportunity-ranking",
      generatedAt: new Date().toISOString(),
      count: ranked.length,
      recommendations: ranked.slice(0, 10),
      nextStep: "Review the highest-ranked offers and validate demand before spending money. Scores are heuristics, not earnings predictions."
    });
  } catch {
    return res.status(502).json({ ok: false, error: "Agent request failed" });
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const companyId = "biz_91TSzrC1FjlII6";
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
      `https://api.whop.com/api/v1/plans?company_id=${encodeURIComponent(companyId)}&first=100`,
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
      data = { raw: text.slice(0, 2000) };
    }

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        connected: false,
        company_id: companyId,
        whop: data
      });
    }

    const plans = Array.isArray(data?.data) ? data.data : [];

    return res.status(200).json({
      ok: true,
      connected: true,
      company_id: companyId,
      plan_count: plans.length,
      plans: plans.map(plan => ({
        id: plan?.id ?? null,
        title: plan?.title ?? null,
        product: plan?.product
          ? { id: plan.product.id ?? null, title: plan.product.title ?? null }
          : null,
        plan_type: plan?.plan_type ?? null,
        currency: plan?.currency ?? null,
        billing_period: plan?.billing_period ?? null,
        initial_price: plan?.initial_price ?? null,
        renewal_price: plan?.renewal_price ?? null,
        trial_period_days: plan?.trial_period_days ?? null,
        visibility: plan?.visibility ?? null,
        purchase_url: plan?.purchase_url ?? null,
        member_count: plan?.member_count ?? null
      })),
      page_info: data?.page_info ?? null,
      read_only: true
    });
  } catch {
    return res.status(502).json({
      ok: false,
      connected: false,
      error: "Whop request failed"
    });
  }
}
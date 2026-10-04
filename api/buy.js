export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const planId = "plan_fK7dls2GbSU4I";
  const checkoutUrl = `https://whop.com/checkout/${planId}`;

  return res.redirect(302, checkoutUrl);
}
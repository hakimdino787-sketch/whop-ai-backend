import Whop from "@whop/sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(503).json({
      ok: false,
      error: "Webhook secret not configured"
    });
  }

  try {
    // Keep the raw request body intact for signature verification.
    const rawBody =
      typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body ?? {});

    const headers = Object.fromEntries(
      Object.entries(req.headers).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(",") : String(value ?? "")
      ])
    );

    const whop = new Whop({
      apiKey: process.env.WHOP_COMPANY_API_KEY,
      webhookKey: Buffer.from(webhookSecret).toString("base64")
    });

    const event = whop.webhooks.unwrap(rawBody, { headers });

    return res.status(200).json({
      ok: true,
      received: true,
      event_type: event.type ?? null,
      payment_confirmed: event.type === "payment.succeeded",
      read_only: true
    });
  } catch {
    return res.status(401).json({
      ok: false,
      error: "Invalid webhook signature or payload"
    });
  }
}

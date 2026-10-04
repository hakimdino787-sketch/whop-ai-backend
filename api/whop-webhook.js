export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const event = req.body || {};
    const eventType = event?.type || event?.event || null;

    // Read-only acknowledgement. Payment state is never changed here.
    return res.status(200).json({
      ok: true,
      received: true,
      event_type: eventType,
      payment_confirmed:
        eventType === "payment.succeeded" ||
        eventType === "payment_success",
      read_only: true
    });
  } catch {
    return res.status(400).json({
      ok: false,
      error: "Invalid webhook payload"
    });
  }
}
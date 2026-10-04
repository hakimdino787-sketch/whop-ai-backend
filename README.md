# BEN AI — Whop Opportunity Agent

Connected to the Whop company API through `WHOP_COMPANY_API_KEY`.

Endpoints:
- `/api/whop-products` — raw connected product inventory
- `/api/agent` — ranked opportunity scan

The agent starts with deterministic scoring so it works without adding another paid AI API key. The daily Vercel Cron refreshes the opportunity scan. Publishing, account changes, and spending are not automated without an appropriate connected permission.

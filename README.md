# BEN AI — Whop Opportunity Agent

Connected to the Whop company API through `WHOP_COMPANY_API_KEY`.

Endpoints:
- `/api/whop-products` — raw connected product inventory
- `/api/agent` — ranked opportunity scan

The agent starts with deterministic scoring so it works without adding another paid AI API key. The daily Vercel Cron refreshes the opportunity scan. Publishing, account changes, and spending are not automated without an appropriate connected permission.


## AI editor integration (Cursor / VS Code)

This repository includes project-level MCP configuration for Whop:
- Cursor: `.cursor/mcp.json`
- VS Code: `.vscode/mcp.json`

Both point to Whop's official hosted MCP endpoint: `https://mcp.whop.com/mcp`. Open this repository in your editor, enable the `whop` MCP server, and complete Whop's browser sign-in/authorization prompt. Do not put API keys, bearer tokens, or authorization headers in these files.

**Security warning:** the hosted Whop MCP currently requests the full `admin` scope, which can reach resources across businesses your Whop user manages. Only authorize it in a trusted editor/workspace. Start by asking the coding agent to list available Whop tools and inspect the current products without creating, updating, deleting, refunding, cancelling, or spending anything. Review every proposed write action before approving it. Disconnect the MCP when it is no longer needed.

## Existing automation

- `/api/whop-products` reads the product inventory using `WHOP_COMPANY_API_KEY`.
- `/api/agent` ranks products deterministically and is scheduled daily by Vercel Cron.
- The current opportunity agent does not automatically spend money or change account data.

The MCP connection is configured in the repository, but it is **not connected until you authorize it inside Cursor/VS Code**. This repository change alone does not verify live Whop access.

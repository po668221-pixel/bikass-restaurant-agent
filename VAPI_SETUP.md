# Vapi dashboard setup — copy-paste steps

Everything here is verified against docs.vapi.ai (fetched 2026-09-19), not
guessed. The one thing that can't be filled in ahead of time is your
deployed webhook URL (order-calculator isn't deployed yet).

## 1. Assistant — First Message and System Prompt

Dashboard → Assistants → your BIKASS assistant:
- **First Message** field: paste the contents of the "First Message" block
  in `bikass_agent_system_prompt.md`.
- **System Prompt** field: paste the contents of the "System Prompt" code
  block in the same file.

## 2. calculate_total — custom Function tool

Dashboard → Tools → Create Tool → **Function**.

- **Name**: `calculate_total`
- **Server URL**: `https://bikass-restaurant-agent.onrender.com/calculate-total`
  — deployed and verified live (2026-09-19): correct totals, and a clean
  error for unrecognized item names. Note: free-tier Render spins down
  after 15 min idle — expect ~30-50s delay on the first call after a quiet
  period until you upgrade off Free (see step 4).
- **Parameters** (paste as the JSON schema):

```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "Exact menu item name as listed in the system prompt menu"
          },
          "quantity": {
            "type": "number",
            "description": "How many of this item"
          }
        },
        "required": ["name", "quantity"]
      }
    }
  },
  "required": ["items"]
}
```

- **Description** (shown to the model, helps it call the tool correctly):
  "Computes the exact total price for a list of menu items and quantities.
  Always call this before reading a total back to the caller — never
  calculate it yourself."

Attach this tool to the BIKASS assistant. The system prompt already
references it by name (`calculate_total`) in the CONVERSATION FLOW and
TOOL USE sections, so no prompt changes are needed once it's attached.

## 3. Order logging — native Google Sheets "Add Row" tool

Dashboard → Tools → Create Tool → **Google Sheets → Add Row**.

Confirmed limitation from Vapi's own docs: this integration only appends
rows — it cannot read, look up, or update existing spreadsheet data. That
matches the design in CLAUDE.md (write-only logging), so no workaround
needed here.

- **spreadsheetId**: from your sheet's URL —
  `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
- **range**: the sheet/tab name, e.g. `Sheet1`
- **values**: maps to columns in order. Suggested column order (create a
  header row in your sheet matching this before testing):

  1. Timestamp
  2. Customer Name
  3. Phone Number
  4. Order Items (the full item + quantity list, as one text field)
  5. Total Price (the number from the calculate_total tool result — not a
     separate calculation)

The system prompt's TOOL USE section already tells the agent to log these
five fields and to use the total from `calculate_total` rather than
recomputing it. Attach this tool alongside `calculate_total`.

## 4. Deploy order-calculator — DONE (2026-09-19)

Deployed on Render's Free tier, service name `bikass-restaurant-agent`,
root directory `order-calculator`, build `npm install`, start `npm start`.
Live at https://bikass-restaurant-agent.onrender.com and verified working
(see step 2).

Remaining decision: Free tier spins down after 15 min idle, causing a
~30-50s delay on the next call while it wakes up. For a live phone line,
that means a caller could sit in silence for that long the first time
`calculate_total` fires after any quiet period. Options before going live
with real customers:
- Upgrade to Render's $7/month plan (no spin-down) — Render → your service
  → Settings → change Instance Type.
- Or accept the risk for early testing and upgrade before soft launch.

## 5. Before trusting any of this in production

Do a handful of test calls yourself first (see the "Things still needed"
list in `bikass_agent_system_prompt.md`) — specifically trigger the
chicken / Bole-and-Fish / turkey disambiguation, ask "are you open," and
place an order big enough that a wrong total would be obvious.

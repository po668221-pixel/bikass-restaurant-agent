# Vapi dashboard setup

Everything here is verified against docs.vapi.ai (fetched 2026-09-19), not
guessed. Steps 1 and 2 are DONE — built directly in your Vapi dashboard on
2026-09-19 (assistant id `6b526a6f-e8cf-42f2-8904-3027...`, published v2).
Step 3 (Google Sheets) is blocked on your input — see that section.

## 1. Assistant — DONE

Created a new assistant (currently named "New Assistant" — rename it to
"Ada" or similar whenever you like, purely cosmetic, no functional effect).
Configured to match the confirmed stack, not left on Vapi's defaults:
- **Transcriber**: Deepgram Nova 3 (was defaulted to Soniox)
- **Model**: Claude Haiku 4.5, temperature 0.3 (was defaulted to GPT-4.1).
  Picked Haiku over Sonnet/Opus specifically for latency — this task is
  mostly scripted order-taking + tool calls, not deep reasoning, and every
  extra 500ms of model latency is dead air the caller sits through.
- **Voice**: Cartesia Sonic 3.5, voice "Audrey — customer service" (was
  defaulted to Vapi's own "Elliot" voice). No Nigerian-accented option
  exists in Cartesia's voice library as of this check — worth revisiting
  once real accent testing starts, per CLAUDE.md.
- **First Message** and **System Prompt**: pasted verbatim from
  `bikass_agent_system_prompt.md` and verified byte-for-byte against the
  live textarea afterward — no drift.
- **Voice fallback**: enabled Vapi's suggested auto-fallback (backup voice
  if Cartesia has an outage) — pure reliability upside, no behavior change
  in normal operation.

## 2. calculate_total — DONE, published and attached

Built as a custom Function tool, published, and attached to the assistant.

- **Name**: `calculate_total`
- **Server URL**: `https://bikass-restaurant-agent.onrender.com/calculate-total`
  — deployed and verified live (2026-09-19): correct totals, and a clean
  error for unrecognized item names. Note: free-tier Render spins down
  after 15 min idle — expect ~30-50s delay on the first call after a quiet
  period until you upgrade off Free (see step 4).
- **Parameters** (the JSON schema actually saved, verified via direct DOM
  read against the live field — not just what was intended to be typed):

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

- **Description**: "Computes the exact total price for a list of menu
  items and quantities. Always call this before reading a total back to
  the caller — never calculate it yourself."

Attached to the BIKASS assistant, version pinned to "Latest" so it
auto-updates if the tool config changes later.

## 3. Order logging — Google Sheets tool created, BLOCKED ON YOU

Tool `log_order` exists in Vapi (Google Sheets → Add Row type), with name,
description, and Range (`Sheet1!A:E`) filled in. It is **not usable yet**
because the two required things only you can provide are still missing:

1. **A real Google Sheet.** None exists yet. Create one with a header row
   matching this column order:
   1. Timestamp
   2. Customer Name
   3. Phone Number
   4. Order Items (full item + quantity list, one text field)
   5. Total Price (from the calculate_total tool result, not recomputed)
2. **The Spreadsheet ID** from that sheet's URL
   (`https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`), pasted
   into the tool's Spreadsheet ID field.
3. Likely also a **Google account connection** for Vapi to write to Sheets
   on your behalf (check Dashboard → Integrations if the tool errors on
   first use asking for authorization) — not confirmed since there's
   nothing to test against yet.

It's already attached to the assistant, so once you fill in the
Spreadsheet ID, no further wiring should be needed.

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

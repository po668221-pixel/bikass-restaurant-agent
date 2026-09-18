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
- **Server URL**: your deployed order-calculator URL + `/calculate-total`
  (e.g. `https://your-app.onrender.com/calculate-total`) — not usable
  until step 4 below is done.
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

## 4. Deploy order-calculator (blocks steps 2's Server URL)

Not done yet — needs your accounts, so this session can't do it directly.
Pick one:
- **Render** (recommended — free tier, detects `npm start` automatically
  from `package.json`, no extra config file needed): New → Web Service →
  connect the GitHub repo → it just works.
- **Railway**: similar, GitHub-connected, auto-detects Node.
- **Vercel**: works, but Vercel is serverless-first — an Express app like
  this one needs a `vercel.json` rewrite to route requests to it. Skip
  unless you specifically want Vercel.

This machine has git installed but no `gh` CLI and no logged-in
Render/Railway/Vercel account, so the actual "create repo on GitHub" +
"connect it on Render" steps need you, in your own browser, logged into
your own accounts. Once you've pushed this repo to GitHub and connected it
on your chosen platform, come back with the live URL and I'll fill it into
step 2 and re-verify the tool end-to-end.

## 5. Before trusting any of this in production

Do a handful of test calls yourself first (see the "Things still needed"
list in `bikass_agent_system_prompt.md`) — specifically trigger the
chicken / Bole-and-Fish / turkey disambiguation, ask "are you open," and
place an order big enough that a wrong total would be obvious.

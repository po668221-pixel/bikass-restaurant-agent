# order-calculator

Computes the exact order total server-side, so the agent never does the
arithmetic itself. This is the single source of truth for order totals:
the same number this returns is what the agent speaks back to the caller
AND what gets logged to the order spreadsheet — never two separate
calculations that could drift apart.

## Run it locally

```bash
npm install
npm start
```

Listens on port 3000 (or `$PORT`) at `POST /calculate-total`.

## Wiring into Vapi

1. Deploy this somewhere reachable over HTTPS (Render, Railway, Vercel, a
   VPS — anything that can run a small Node/Express app). Not yet deployed.
2. In Vapi: Dashboard → Tools → Create Tool → Function, name it
   `calculate_total`, parameters `{ items: [{ name: string, quantity: number }] }`,
   server URL = your deployed `/calculate-total` endpoint.
3. Attach the tool to the BIKASS assistant alongside the Google Sheets
   Add Row tool.
4. Test with a real call before trusting it — confirm the returned total
   matches manual math, and confirm an unrecognized item name (e.g. a
   mis-heard order) produces the "not on the menu" error instead of a
   wrong number.

## The menu-drift risk (read this before editing the menu)

The price table in `index.js` is a copy of the menu, not a live read of
`restaurant_menu.xlsx` or `bikass_agent_system_prompt.md`. All three
currently agree exactly (131 items, same names, same prices) because they
were generated from one source in the same pass — but nothing enforces
that going forward. If you add, remove, rename, or re-price a menu item,
you have to update all three by hand:

- `restaurant_menu.xlsx`
- `bikass_agent_system_prompt.md` (the `# THE MENU` section)
- `order-calculator/index.js` (the `PRICES` object)

If the item name the agent says doesn't exactly match a key in `PRICES`,
`calculate_total` returns an error instead of a wrong number — so a drift
shows up as a broken call, not a silently wrong total. That's a safety
net, not a substitute for keeping the three in sync.

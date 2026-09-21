# BIKASS Restaurant AI Voice Agent — Project Context

Drop this file, `restaurant_menu.xlsx`, and `bikass_agent_system_prompt.md` into
the project folder you open in Claude Code's Code tab. This file is named
`CLAUDE.md` on purpose — Claude Code auto-loads it as persistent project memory
every session, so you don't need to re-explain any of this by hand.

## What this is
An AI voice agent that answers the phone for BIKASS, a Nigerian restaurant, and
takes food orders automatically. Built by an IT student as a hands-on project —
also intended as a portfolio piece / stepping stone toward other opportunities,
not just a one-off tool.

## Confirmed stack (do not re-debate without a real reason)
- **Vapi** — orchestration + telephony. Phone number already acquired.
- **Claude** — reasoning / tool-calling model.
- **Deepgram Nova-3** — speech-to-text. Not yet tested against real Nigerian
  accents — that testing is still outstanding, not done.
- **Cartesia** — text-to-speech. Chosen over ElevenLabs/Fish Audio for lower
  latency (~90ms) and lower cost at scale.

## Key design decisions (confirmed — treat as settled unless the user says otherwise)
- **Inbound-only.** The agent never calls a customer. Missed calls are called
  back manually, by a human, on a normal phone — not through the AI.
- **Pickup only for now.** Delivery is intentionally out of this build, not
  an oversight — bring it back as its own follow-up phase rather than
  bolting it on ad hoc. If a caller asks about delivery, the agent says
  pickup is the only option right now and a team member will follow up.
- **Hours: 8:00 AM – 10:00 PM.** Confirmed by the user and baked into the
  system prompt so the agent can answer "are you open" questions without
  hallucinating. Days-of-week were not specified — current prompt assumes
  the same hours apply every day; flag/confirm if that's wrong.
- **Order totals are computed by a dedicated webhook, not by the LLM.**
  See `order-calculator/` — it's the single source of truth for the total:
  the same number is spoken back to the caller and logged to the sheet,
  rather than two separate calculations that could drift apart. Reason:
  LLMs doing live multi-item arithmetic by voice, under latency pressure,
  are an unreliable way to get money-accurate totals. Not yet deployed or
  wired into Vapi as a tool — see that folder's README for the remaining
  steps. Known risk: the price table lives in three places (xlsx, system
  prompt, webhook) with nothing enforcing they stay in sync — the webhook
  fails loudly (returns an error) on an unrecognized item rather than
  silently returning a wrong total, but that's a safety net, not a fix.
- **Menu lives directly in the Vapi system prompt**, not in a live Google Sheet
  lookup and not in Vapi's Knowledge Base / Query Tool. Chosen deliberately for
  reliability: Vapi's own docs and user reports show the Knowledge Base
  approach can hallucinate or query the wrong source. A static prompt removes
  that failure mode at the cost of a small, constant latency overhead.
- **Order confirmation is logged via Vapi's native Google Sheets "Add Row"
  tool.** Note: Vapi's Google Sheets integration is write-only — it cannot
  read or look up existing data, only append rows. This tool is NOT yet built
  in Vapi. Still to do.
- **Pricing rules:**
  - Main Dishes and Soups are priced **per portion** — multiply listed price
    by quantity (e.g. 2 portions of Jollof Rice = 2000 x 2 = 4000).
  - Proteins are ordered as **direct units**, not "portions" (e.g. 2 chicken
    = 2 separate orders, no portion language).
  - Beverages, Snacks, Swallow, Miscellaneous, and Cakes are single-item
    pricing, multiplied by quantity.
- **Disambiguation rule:** if an item name could mean more than one menu
  entry, the agent must always ask which one rather than guessing — even
  when both options are the same price, since they can still be different
  dishes. Known cases: "chicken" = Big Chicken ₦4,800 vs Biggest Chicken
  ₦5,500; "Bole and Fish" = ₦5,000 regular vs ₦6,000 large; "turkey" = Fried
  Turkey ₦6,000 (dry/fried) vs Turkey in Stew ₦6,000 (caller may say "sauce
  turkey" for this one). The chicken case was explicitly requested by the
  user; Bole-and-Fish and turkey are Claude's generalizations of the same
  rule — **none of the three are tested live yet**, flag as unverified if
  asked. The menu was simplified from 4 turkey entries to these 2 (dropped
  Small Turkey ₦4,500 and Medium Turkey in Stew ₦4,000) at the user's
  request, since most callers don't specify size.
- **No card numbers taken over the phone** (PCI risk). Payment is handled at
  pickup/delivery, not on the call.
- **WhatsApp version** (text ordering + WhatsApp voice calls) is a deliberately
  separate Phase 2, to start only after the phone agent is fully built and
  tested. Not started. WhatsApp's Calling API is confirmed to exist but is
  still an "emerging" integration category — treat it as higher-risk than the
  core phone build when it comes up. Same inbound-only rule applies: the
  agent answers WhatsApp calls/chats when the customer initiates, never
  reaches out first. Text side should be able to send the customer an
  account number and draft/send an invoice or receipt as a document —
  that was part of the original spec, not yet built.
  **What carries over from the phone build vs. what doesn't:**
  - Carries over directly: the Claude system prompt/order logic, the menu
    data, the Deepgram custom-vocabulary list tuned from accent testing, the
    Cartesia voice choice.
  - Has to be rebuilt fresh: the Calling API wiring itself (different
    transport/webhooks than a phone call), all text-mode behavior (account
    number, invoice/receipt sending, async chat pacing), and a fresh round of
    voice-accuracy testing — WhatsApp audio is compressed differently than a
    phone line, so don't assume phone-line accuracy carries over untested.
- **Catering is explicitly out of scope for this build.** This is a
  single-restaurant, quick-order agent — not the catering/event-order flow
  discussed earlier for the separate Saudi Arabia venture. Don't add
  catering-branch logic unless the user asks for it back in.

## Roadmap status
1. ✅ Menu structuring — done, see `restaurant_menu.xlsx` (131 items, 8
   categories, priced in Naira; was 133, collapsed 4 turkey entries to 2)
2. ✅ Core conversation build — assistant built directly in Vapi (2026-09-19,
   published v2), named "Ada": Deepgram Nova 3, Claude Haiku 4.5, Cartesia
   Sonic 3.5 ("Audrey"), First Message + System Prompt pasted and verified
   byte-for-byte against the live field. See `VAPI_SETUP.md` for exact
   config.
3. ✅ Google Sheets order-logging tool — Google Sheet "BIKASS Orders"
   created with the 5-column header row, `log_order` tool published in
   Vapi with the real Spreadsheet ID and Range, attached to the assistant
   (2026-09-19). NOT yet confirmed it can actually write — no test order
   has landed in the sheet yet, so a Google account authorization step
   inside Vapi might still be needed. Verify on first test call.
4. ✅ Order-total calculator webhook — deployed, live at
   https://bikass-restaurant-agent.onrender.com, wired into Vapi as the
   `calculate_total` function tool, published and attached to the
   assistant (2026-09-19). Free tier spins down after 15 min idle
   (~30-50s wake delay) — decide whether to upgrade before real customers
   call.
5. ⬜ Real accent testing — 10-15 real people with genuine Nigerian-accented
   English calling and ordering naturally. Not started. This is expected to
   be the longest phase — don't let it get rushed or skipped.
6. ⬜ Edge cases / human handoff refinement
7. ⬜ Soft launch, watched closely for the first week or two

Rough total estimate: 50-70 hours. Treat all phase timings as estimates that
will shift once real testing starts, not commitments.

## Two real bugs found and fixed via logs, not guesses (2026-09-19)

**Bug 1 — webhook crash.** First order attempt: `calculate_total`
returned HTTP 500 on all 3 attempts, so Ada punted to a callback. Root
cause, found in Render's runtime logs: `call.arguments` was `undefined`
because Vapi's real payload nests arguments under `call.function.arguments`
for this setup, not flat like docs.vapi.ai implied when checked earlier.
Fixed `order-calculator/index.js` to handle both shapes, never throw on a
bad payload, and log the raw request body so a future mismatch is visible
instead of a silent crash.

**Bug 2 — the real blocker.** After fixing bug 1, a second test call still
failed: `calculate_total` returned "no items array received" every time.
Render logs showed why: Claude was calling the tool with `arguments: {}`
— completely empty. Checked the tool's own Parameters config in Vapi and
found the schema was silently empty (`properties: {}`), even though it
had been built and published earlier in this project. Root cause: an
earlier click on the Parameters "Visual" tab (dismissed as a no-op at the
time) reset the schema, and that empty state got published without being
re-verified. Claude had no way to know an `items` parameter existed, so
it called the tool with nothing. **The Parameters JSON editor in Vapi has
its own "Apply" button below the code box, separate from the tool's
top-level Publish — editing the JSON without clicking Apply does not
persist, and Publish won't even show a pending change.** Rebuilt the
schema via the JSON tab, clicked Apply, then Published, then verified by
reloading the page fresh (not trusting in-session state) and confirming
`items` shows in the Visual tab. Also caught mid-investigation: with an
empty schema, Ada fell back to calculating the total herself and got it
wrong (said 5250 for an order that's actually 4150) — the exact failure
mode `calculate_total` exists to prevent, now confirmed fixed.

**Lesson**: don't trust a fetched docs page as ground truth for a
third-party API's wire format, and don't trust a UI's "saved" appearance
without reloading fresh to confirm — verify against production logs and
a clean reload when something real fails.

## Corrections from the user's first real test call (2026-09-19)
- **Restaurant name mispronounced.** "BIKASS" spelled that way was read
  wrong by Cartesia's TTS. Fixed by respelling it "Bika's" everywhere in
  the spoken-facing text (First Message + System Prompt) — the written
  project name stays "BIKASS" in docs, only the TTS-facing spelling
  changed. Confirmed live in Vapi v4.
- **Prices read in the wrong number style.** The agent was reading amounts
  like 13400 as "thirteen four hundred" (clipped Western shorthand)
  instead of the Nigerian convention "thirteen thousand, four hundred
  naira". Added an explicit rule (PRICING RULES rule 5) requiring
  "thousand" to always be said for amounts ≥1,000. Confirmed live in
  Vapi v4. **Not yet re-tested** — user should verify this actually fixed
  it on the next test call before trusting it.

## Third round of real-call findings (2026-09-21)
- **Google Sheets logging is intermittently failing.** A live call showed
  `Log Order: Missing Nango configuration for tool type: google.sheets.row.a...`
  even though other calls logged successfully. Root cause: Vapi's native
  Google Sheets integration (Dashboard → Settings → Integrations → Google
  Sheets) was never actually OAuth-connected — it showed "Connect", not
  "Connected". This is separate from the Spreadsheet ID/Range config,
  which was correct. **User needs to click Connect and complete Google
  sign-in themselves** — this can't be done from an automated session.
  Until connected, some fraction of orders may say "confirmed" to the
  caller but never actually land in the sheet. Verify by connecting, then
  making a test call and checking the sheet directly.
- **Latency (~1,330ms avg turn) is normal for this stack, not a bug.**
  Checked Vapi's real Latency Summary for a call: Transcriber 201ms +
  Endpointing 305ms + LLM 488ms + Voice 305ms ≈ matches the average.
  That's close to the practical floor for a Deepgram+Claude+Cartesia
  pipeline — not something a setting can fix without a different
  architecture. The real outliers (4 of 25 turns hit 2,000-2,600ms) were
  all caused by Endpointing spiking to 1,500ms+, which happens when a
  caller trails off or hesitates mid-sentence and the turn-detector isn't
  sure they're done. Not something to "fix" so much as an inherent
  trade-off of waiting long enough to avoid interrupting people.
- **Audio "skips" during Ada's speech — cause not identified.** No
  evidence found yet pinpointing this (not visible in the latency data).
  Possible causes not yet ruled out: Cartesia streaming hiccups, the
  voice-fallback feature switching mid-response, or an artifact specific
  to browser-based Talk-button testing (WebRTC) vs a real phone call.
  Revisit if it keeps happening once a real phone number is attached.
- **Money still occasionally read digit-by-digit despite the earlier
  fix.** Same call: agent said "4 8 0 0 naira" and "5 5 0 0" during
  chicken disambiguation, even though the final total was read correctly.
  The earlier prompt-only fix wasn't reliable enough for ad-hoc price
  mentions. Fixed properly this time: `calculate_total` now returns a
  `totalWords` field (e.g. "fourteen thousand, four hundred and fifty
  naira") computed deterministically in code, and the agent is told to
  read that verbatim instead of converting the number itself. Also
  spelled out the disambiguation prices (chicken/Bole-and-Fish/turkey)
  directly in the prompt so those specific ad-hoc mentions don't rely on
  the model's own number-to-words conversion either. **Not yet verified
  on a real call** — verify on the next test call that both the total and
  the chicken-price disambiguation are read correctly.

## Explicitly unresolved — verify before assuming true
- Whether Deepgram Nova-3 actually handles Nigerian-accented English well
  enough as-is, or needs a custom vocabulary list built from real test-call
  failures.
- Whether the chicken / Bole-and-Fish / turkey disambiguation logic
  actually fires correctly in a live call.
- Whether "same hours every day" is actually true — only open/close time
  was confirmed, not which days BIKASS is open.
- Whether the order-calculator webhook's response shape actually matches
  what Vapi's custom-tool contract expects once wired up live — built
  against the documented contract, not verified against a real Vapi call.
- Whether Vapi's telephony provider had any issues issuing the Nigerian
  number (user reports this is already resolved, but the process itself
  wasn't independently confirmed in this project's research).
- How many simultaneous calls/chats the actual Vapi plan supports.
  "Handles multiple customers at once" is true architecturally (each call/
  chat is an isolated session), but every plan has a real concurrency limit —
  confirm it covers actual rush-hour volume, don't assume it does.

## Caution — do not treat as real targets
Vendor blogs researched during this project claimed restaurant AI phone
agents recover $15K-25K/year or $15K-35K/month in revenue (Certus AI, and a
separate agency's own client claims). Both are marketing copy from companies
selling their own product, not independent data. Do not let these numbers
shape expectations, roadmap decisions, or anything said to the user about
expected ROI. The only numbers that matter are the ones this specific build
produces once it's live.

## How the user likes to work
- Wants honest, critical feedback — not validation, not softened bad news.
- Wants assumptions confirmed before being acted on, not guessed at.
- Explicitly does not want hallucinated or unverified claims stated as fact.
- Treats this as a professional working relationship, not casual chat.

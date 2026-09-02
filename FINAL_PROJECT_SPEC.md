# GuacaDoc — Final project specification

**What is described below is what is in the repository.** Every file path, tool
name, schema, threshold and number in this document was read out of the source
or measured by running it. Nothing here is planned, aspirational or partially
wired. Where something is deliberately absent, it is listed in
[§10 Not built](#10-not-built).

Written in English to match the rest of the repository (`README.md`,
`DESIGN.md`, code comments).

---

## 1. What the app is

A static web app, served as a folder of files, that turns one local document
into a set of WebMCP tools an AI agent can call — while keeping the document
itself inside the browser tab.

The file is opened with the file picker or dropped on the page, parsed in the
tab, split into sections, and scanned locally for identifying values. The user
decides, per value or per type, whether it goes out **as written**, **as a
stable token**, or **never**. An agent then reads the document only through five
registered tools, and every answer those tools return passes a single policy
function that substitutes, measures what left, asks for consent on writes and
appends an audit line.

There is no backend. `next.config.ts` sets `output: "export"`, so the build
product is `out/` — HTML, JS, CSS, fonts and one pdf.js worker. There are no API
routes, no server actions and no middleware in the repo.

**Current state:** builds, typechecks clean (`tsc --noEmit`), and 37 assertions
over the core layer pass (`npm run verify`).

---

## 2. Architecture

Five layers. Each one is a directory, and the boundaries are enforced by which
module is allowed to talk to the agent.

```
extract/          File → plain text, in the tab
  ↓
sections.ts       Text → addressable sections (s01…sNN)
detect/           Text → entities (value, key, token, aliases, spans)
  ↓
[ the user marks: visible | pseudonymized | blocked ]
  ↓
policy/wrapper    ── the only door to the agent ──
  redact.ts       substitute every string on the way out
  measure.ts      scrub + count billable bytes + truncate to the cap
  confirm.ts      suspend the call on a modal, for writes
  store.ts        record the call, the bytes and the text that left
  ↓
webmcp/api.ts     document.modelContext.registerTool(), generational
```

### The one-door rule, in code

`registerToolWithPolicy()` in `src/lib/policy/wrapper.ts:60` is the only
function in the project that builds a tool descriptor and hands it to the
browser. `src/lib/webmcp/tools.ts` declares five tools and registers all five
through it. No handler talks to an agent directly, so a handler cannot leak by
forgetting to redact: the wrapper scrubs the entire result tree after the
handler returns, and the handler has no say in it.

### State

One module-level singleton, `src/lib/store.ts`, exposed to React through
`useSyncExternalStore` (`src/lib/useStore.ts`). It is not React state for two
reasons that are both load-bearing: tool handlers run outside the React tree and
need the current value synchronously, and a single object makes the
"memory only" claim auditable — nothing in it is ever serialized.

---

## 3. Data model

`src/lib/types.ts`.

| Type | Role |
| --- | --- |
| `Entity` | `{ id, type, value, key, token, aliases[], level, source, spans[] }` |
| `EntityType` | 12 values: `person org email phone iban card date amount reference location id custom` |
| `EntityLevel` | `visible` \| `pseudonymized` \| `blocked` |
| `EntitySource` | `regex` \| `heuristic` \| `manual` |
| `Section` | `{ id, title, level, text, start, end }` |
| `LoadedDocument` | `{ name, kind, text, sections[], byteLength, loadedAt }` |
| `AuditEvent` | `{ seq, ts, tool, args, decision, bytes, detail?, boundary? }` |
| `PolicyDecision` | `allowed truncated denied cancelled error` |
| `TransmittedChunk` | `{ seq, ts, tool, text, bytes }` — what actually left |
| `Finding` | `{ id, ts, sectionId, note }` — an agent write, after consent |

`key` is the normalized form (`src/lib/tokens.ts:normalizeValue`) and is what
decides token identity: `+33 6 41 88 07 23` and `06 41 88 07 23` collapse to the
same key, so they get the same token. `spans` holds the character offsets of
*every* occurrence in the extracted text, not just the one the rule matched.

---

## 4. Pipeline, concretely

### 4.1 Extraction — `src/lib/extract/index.ts`

Accepts `.txt .md .markdown .pdf .docx`.

- **PDF**: `pdfjs-dist` v6, worker loaded from `/vendor/pdf.worker.min.mjs`.
  `scripts/copy-pdf-worker.mjs` copies it out of `node_modules` into `public/`
  at `dev` and `build` time, because loading it from a CDN would be an outbound
  request the CSP forbids. Lines are rebuilt from text-item `transform[5]`
  (Y position) and `hasEOL`.
- **DOCX**: `mammoth.extractRawText`, bundled.
- **TXT/MD**: `File.text()`.

Then whitespace normalization (CRLF, NBSP, trailing space, runs of blank lines).
A file that yields no text throws a message that names the reason: a scanned PDF
would need OCR, which would need a model this app refuses to call.

`loadFromString()` is the same path for the bundled sample, without a picker.

### 4.2 Sectioning — `src/lib/sections.ts`

Three heading shapes are detected: Markdown `#`…`######`; numbered forms
(`Article 5 - Liability`, `3.2 Payment terms`, `SECTION IV`, plus `clause`,
`annex/annexe`, `appendix`, `chapter`, `partie`, `chapitre`); and short all-caps
lines with no terminal punctuation. Bodies over `MAX_CHARS_PER_SECTION = 2400`
are cut on paragraph boundaries into `… (part N)`. Sections are `s01`, `s02`, …
A document with no headings becomes one `Document` section, split if long.

Sections are the unit of the whole tool surface: small and named is what lets
an agent work a document without asking for all of it at once.

Three guards keep body text from being promoted to a heading, all three paid
for by a real agent run against the sample (see §9):

- the line must open with a capital or a digit, which rejects the wrapped
  cross-reference `clause 1. Kaltbrunn served notice of a rate revision…`;
- the numeral must end where a numeral ends, because `[\dIVXLC]+` under `/i`
  matches the `i` of `is`, which read `clause is likely unenforceable…` as
  clause I;
- an all-caps line that is mostly digits is data, not a title, which stops an
  account number on its own line from becoming one.

This matters beyond tidiness. `get_document_outline` serves titles without
charging for them, so a mis-promoted title is body text moving through the free
channel. The three false positives were putting 152 B of contract prose out at
zero billed bytes.

### 4.3 Detection — `src/lib/detect/`

Local only. No model, no network — sending the document to a remote recognizer
would recreate the exact leak the app exists to prevent.

**`patterns.ts`** — 10 ordered rules, declared specific-before-greedy, each with
an optional rejection pass:

| Rule | Notes |
| --- | --- |
| Email | |
| IBAN | rejected below 15 chars once spaces are stripped |
| Payment card | 4×4 groups |
| Phone | FR national, `+33`, generic international; rejected below 8 digits |
| Postal address | FR (`9 rue des Ateliers, 59300 Vaubercourt`) and EN (`41 Harrowgate Row, Elverstoke`) as **one** entity, town optional |
| Postcode + town | only fires where no full address matched |
| Monetary amount | `€ $ £ EUR USD GBP NOK CHF`, prefix or suffix |
| Date | ISO, numeric, EN month names, FR month names |
| Reference number | `MSA-2027-0418`, `INV/2027/0331`, `ABC1234` |
| Long numeric id | 9+ digits |

**`heuristics.ts`** — capitalized-run detection for people and organizations,
tuned to over-detect: a false positive costs one click, a false negative
silently leaves a name in the outbound text. It carries three stop-lists
(company markers, civility titles, 137 words capitalized for a reason other
than being a name — sentence openers, structural words, contract defined terms
like *the Client*), refuses to cross a sentence boundary or more than one line
break, skips heading lines where Title Case means nothing, and skips character
ranges already claimed by a pattern rule.

**`aliases.ts`** — a document introduces *Marceline Dubreuil* once and then says
*Dubreuil*. Each multi-word name contributes its distinctive parts as aliases
mapped to the same token, and an alias is kept **only if it actually occurs
outside the full form** somewhere in the text, so the count stays honest.

**`index.ts`** — resolves overlaps (highest-priority, then longest, wins),
groups by `type:key` so surface variants share one token, then re-scans the
whole text for every literal occurrence of each value
(`allOccurrences`, case-insensitive for person/org/location/email, whitespace-
flexible so a name wrapped across a line break still matches).

Defaults, from `DEFAULT_LEVELS`: **everything detected is protected**. `iban`
and `card` default to `blocked` because an account number carries no analytical
value; everything else defaults to `pseudonymized`. There is no
"detected but doing nothing" state, because a highlight that protects nothing
teaches people to trust highlights.

### 4.4 Substitution — `src/lib/redact.ts`

`buildRedactor(entities)` returns four functions:

- `apply(text)` — one regex alternation of every non-visible surface form,
  **longest first** so `Marceline Dubreuil` beats the alias `Dubreuil`, with
  Unicode letter/number lookarounds instead of `\b` so accented names work.
- `verify(text)` — reports any non-visible source value still present.
- `scrub(text)` — `apply`, then `verify`; if anything survived (a value glued to
  a letter, say), a second boundary-free literal pass hardens it and verifies
  again. **This is what the wrapper calls.** Nothing leaves without it.
- `decode(text)` — reverses pseudonymization locally, for the decode panel.
  Blocked values have no token, so they are not reversible by construction.

Tokens are `[PERSON_01]`, `[ORG_02]`, `[BLOCKED_IBAN]` — minted per type in
order of first appearance by `src/lib/tokens.ts`, stable for the session.
Stability is the property that makes the output useful: it is what lets an agent
know the signatory of §2 is the same person named in §7.

### 4.5 Search — `src/lib/search.ts`

Search runs over the **redacted** text, never the source. If it hit the
original, the tool would become an oracle: an agent could ask for `Dubreuil` and
learn from a hit or a miss whether that name is in the file, without one byte of
it being returned. The cost is that blocked values are genuinely unfindable,
which is the point. Snippets are ±90 chars around the first match, whitespace
collapsed, ranked by match count.

---

## 5. The tool surface

`src/lib/webmcp/tools.ts`. Five tools. `PER_CALL_CAP = 4096` bytes for all of
them. There is no `get_full_text` and there is no bulk read: a tool that
returned the document would defeat every layer above it.

| Tool | Input | Access | Confirmation | Free keys |
| --- | --- | --- | --- | --- |
| `get_document_outline` | — | read | no | `title` |
| `search_document` | `query: string`, `limit?: number` (1–10, default 5) | read | no | `query`, `title` |
| `get_section` | `id: string` | read | no | — |
| `get_metrics` | — | read | no | — |
| `add_finding` | `section_id: string`, `note: string` | **write** | **yes** | — |

Every schema sets `additionalProperties: false`. Every descriptor carries
`annotations: { readOnlyHint, untrustedContentHint: true }` — hints for the
agent's planning, which enforce nothing, because enforcement is the wrapper's
job either way.

**Free keys** are the auditable exemption from billing. A key is billed unless
it appears in the global structural set (`measure.ts:STRUCTURAL_KEYS` — `id`,
`level`, `type`, `ok`, `reason`, `hint`, `_metrics`, …) or in the tool's own
declared `freeKeys`. The outline exempts `title` because a map of the document
is structure, not contents, and billing it would push agents to skip the cheap
step and read sections blind. `search_document` exempts `query` because the
agent sent it. The default is fail-safe: forgetting to classify a new field
makes it expensive, never free.

Unknown ids return a `hint` that names the tool to call for valid ones. A search
with no hits returns a hint stating that search runs on redacted text, so real
names are not findable by design — an agent that gets zero results learns why
rather than retrying.

### Registration is generational — `src/lib/webmcp/api.ts`

The WebMCP API has no `unregisterTool()`; a tool is withdrawn by aborting the
signal it was registered with. `beginRegistration()` aborts the previous
generation and returns a fresh `AbortSignal`; `registerAllTools()` returns a
disposer that React's effect cleanup calls. Without this, a second mount
re-offers five names the browser already holds, every call is rejected with
`InvalidStateError`, and the page goes on advertising tools while the browser
answers an older set of closures.

Each tool also lands in a local `Map`, which backs the in-page agent console.
The two registries are never assumed to agree: `publishRegistrationReport()`
asks `getTools()` first, because the browser's own answer is the only one that
cannot be wrong, and falls back to per-call outcomes where that method is
missing. The result is stored as `browserTools: { accepted, rejected, verified }`
and is what the header counts. `webmcp live · 5 tools` above an empty record is
made impossible by design, and refusals are surfaced in a banner naming the
reason plus the two headers WebMCP needs.

---

## 6. The policy wrapper, step by step

`src/lib/policy/wrapper.ts`. Order matters and is fixed:

1. **No document** → `denied`, audit line, `{ ok: false, reason: "no_document" }`.
   An attached agent typically probes before the user opens anything; those
   calls are answered and recorded.
2. **Write tool** → `requestConfirmation()`. `requestUserInteraction()` is
   called on the browser API where it exists (it only brings the tab forward),
   then the call **suspends on an open promise** held by the modal. No timeout,
   no default answer. Declined → `cancelled`, and the agent gets
   `declined_by_user` with "do not retry". A second write arriving while a
   prompt is already open → `denied` with `confirmation_busy`, never
   `declined_by_user`: only one modal can be on screen, agents batch their
   calls, and reporting a refusal nobody made would put a lie in the record.
3. **Handler runs.** A throw becomes `error` with the message, not an exception
   crossing the boundary.
4. **Scrub and measure** the whole result tree (`truncateToFit` →
   `scrubAndMeasure`). Strings over the per-call cap are truncated by
   repeatedly trimming the longest counted string until it fits, appending
   `[…truncated]`. The cap is a response size, not an allowance: truncating
   beats refusing, because a partial section still tells the agent whether the
   rest is worth asking for.
5. **Residual leaks** (values that survived pass one and were neutralized by
   pass two) are recorded as `redaction` violations. It means a detection rule
   needs work, and it is shown rather than swallowed.
6. **Agent aborted mid-call** (`options.signal.aborted`) → `cancelled`, 0 bytes.
   Counting an answer the runtime discarded would put bytes on the record that
   never left and print text nobody read.
7. **Success** → record the transmission (the redacted text and its byte count),
   append the audit line as `allowed` or `truncated`, and return
   `{ ok: true, …payload }`.

There is **no session quota**, and that is a decision rather than an omission.
The document an agent receives has already had its identifying values replaced;
serving it in smaller pieces protects nobody, and a cap only teaches a model to
ask for the important parts first. What survives is the measurement, because
the record is the thing a person can check.

Bytes are UTF-8 (`TextEncoder`), not string length.

---

## 7. Feature list

### Document handling
1. Open by picker, drag-and-drop, or the bundled sample contract — `DropZone.tsx`.
2. TXT / MD / PDF / DOCX parsed in the tab; PDF worker served from own origin.
3. Automatic sectioning with three heading grammars and 2 400-char splitting.
4. Extraction failures reported in plain language (scanned PDF, unsupported type).

### Detection and marking
5. 10 regex rules + a name/organization heuristic, entirely local.
6. Postal addresses matched as a single entity across number, street and town.
7. Alias derivation for short later mentions, kept only when they really occur.
8. Every occurrence of a detected value is marked, not just the matched one.
9. Whitespace-flexible matching, so a value wrapped across a line break is caught.
10. Three levels per entity — shown / token / withheld — set by clicking a mark
    in the document (`DocumentPane.tsx`, cycles) or the switch in the list.
11. Per-type bulk switching from a group header — `EntityPanel.tsx`.
12. Manual marking of any selection via a fixed bar in the header, with six
    types (`MarkBar.tsx`); the bar replaced a popover that missed selections
    ending outside the pane and covered the words being classified.
13. **Selection absorption** — marking `9 rue des Ateliers, 59300 Vaubercourt`
    folds the town entity that sits inside it into one entity with one token,
    and says so; an entity that also occurs elsewhere keeps its own mark there
    (`actions.ts:addManualEntity`).
14. Untrack an entity; filter the list by value or token.
15. `rerunDetection()` re-scans while keeping manual entities.

### The comparison view
16. Two documents side by side, never stacked, scrolled together on **scroll
    ratio** rather than pixel offset — substitution changes text length, so the
    same clause stays roughly opposite itself (`SplitDocument.tsx`).
17. The right pane is rendered from **the same redactor the tools use**, so what
    is shown cannot drift from what is sent (`AgentPane.tsx`).
18. Tokens and blocked markers styled distinctly in the agent pane.

### Disclosure control
19. No session quota. Rationing a text whose identifying values are already
    substituted protects nobody, so nothing caps how much an agent may read.
    What is kept is the measurement.
20. Per-call cap of 4 096 served bytes, with truncation instead of refusal.
21. Structural keys and per-tool declared `freeKeys` exempt from the count;
    everything else counted as served by default.
22. Refusals returned as structured, actionable answers — `declined_by_user`,
    `confirmation_busy`, `aborted`, `no_document`, `tool_error` — never
    thrown.
23. Consent modal for write tools that suspends the call, closes on Escape as a
    decline, and resolves to `false` if the session is cleared underneath it.
24. Disclosure meter drawn as a halved avocado: the flesh fills with the share
    of the file served, the stone carries the count of values never served, and
    the exact byte count sits underneath (`Meter.tsx`).

### Observability
25. **Service strip** — every chunk that actually left the tab, in order, with
    its timestamp, tool and byte count. Declined writes are interleaved into
    the same strip by timestamp, in the stone brown, so a call that returned
    nothing still leaves a mark (`Strip.tsx`).
26. **Record of every call** — sequence, clock with milliseconds, tool,
    arguments, decision badge, bytes served, detail (`AuditLog.tsx`).
27. **Session boundaries are marked, not erased.** Opening a document restarts
    the byte count and the token registry but keeps the record, with a `boundary`
    row at the seam — an agent's first probes cannot vanish from a trail that
    claims to be gapless (`store.ts:startDocument`).
28. **Unseen-call counter** on the Agent tab, cleared by actually looking at the
    record; never a red dot, because a call the policy answered is the system
    working.
29. **Agent activity bar** on the Document view, appearing only when there are
    calls you have not looked at, and stating only what is knowable: that an
    agent is attached, and how those calls split into answered and refused. An
    attached agent that has called nothing is not news, so silence means
    nothing has happened. It deliberately does not claim the page is being
    read — a DOM snapshot or screenshot is invisible to the page, so a bar that
    lit up for them would be guessing (`AgentActivityBar.tsx`).
30. Registration-refusal banner naming the count, the last reason, and the two
    headers WebMCP requires.
31. Runtime-violation banner counting blocked network/storage attempts.
32. **JSON session record export** (`export.ts`) containing document metadata,
    bytes served, per-entity token/type/level/occurrence counts, every call, every
    transmission with its redacted text, findings, blocked attempts, and what
    the browser confirmed holding — and **not one source value**, because
    exporting the mapping would put the protected data on a disk.

### The key, and the way back
33. **Token map hidden by default.** An agent driving the tab can read the page,
    so real values are not in the DOM at all until asked for — absence, not a
    CSS blur (`TokenMap.tsx`).
34. **Bounded reveal** (`useAutoHide.ts`): 45 s countdown for the key, 120 s for
    a decoded answer, and it ends immediately on `blur`, `pagehide` or
    `visibilitychange` — three facts the browser states rather than infers. The
    remaining seconds are shown, because a secret that vanishes without warning
    teaches people to re-reveal it instantly.
35. Reveal copy changes when an agent is attached, naming that it can read the
    screen.
36. **Decode panel** — paste the agent's token-bearing answer, get the real
    names back, assembled in the tab from your key. It counts recognized tokens
    and states that withheld values cannot be restored, because they have no
    token to restore from (`DecodePanel.tsx`).
37. Withheld entities are counted but **not listed** in the key.

### The in-page agent
38. **Agent console** (`AgentConsole.tsx`) that calls the same registered tools
    through the same wrapper — no privileged path, no separate demo code. If the
    console cannot see a value, neither can a browser agent. It exists because
    WebMCP still needs a specific browser and a reviewer should not need one.
39. Per-tool argument form generated from the JSON Schema, with the tool's own
    description shown.
40. **Sample investigation** — outline → search `liability` → two sections →
    metrics, the way an agent actually works a document.
41. **Read every section** — hands the agent the whole document, one section at
    a time, so that the absence of a quota is one click away from being seen.
42. Findings written by the agent listed with their section id.

### Front page
43. The hero at `/` pairs the claim with **a real screenshot of the comparison
    view**, plus one concrete errand ("ask an agent to summarise the liability
    clauses of a client contract you are not allowed to upload") and the
    three-step sequence.
44. **The tool surface, named on the page**: all five tools with their access
    and one line each, `document.modelContext.registerTool()` spelled out, and
    a paragraph on the single wrapper that substitutes after the handler
    returns and on generational registration via `AbortSignal`.
45. **A "How to try it" panel**, because a reader on a browser without the API
    sees `webmcp absent · 0 tools` and has no way to know that is expected. It
    gives both paths: the in-page console on any browser, and Chrome 149+ with
    `chrome://flags/#enable-webmcp-testing` or ChatGPT's in-app browser for a
    real agent.
46. **A second screenshot of the agent view**, full width, from a real run of
    the sample investigation: the meter, the strip, the record with its
    decisions, and the masked key.
47. Four figures from the sample, computed at build time by the real detector
    (`sample-stats.ts`), so the copy cannot drift from the app: entities
    detected, withheld outright, addressable sections, bytes the agent may
    spend. The sample's own byte count is deliberately not one of them — how
    big the example file happens to be is a fact about the example.
48. Navigation between `/` and `/app` uses plain `<a>` rather than `next/link`,
    because client-side routing fetches an RSC payload and this origin is not
    allowed to fetch anything.

### Design system
49. Palette, type and iconography are the metaphor: flesh = what the agent
    receives, stone = what it never does, skin = the surface the machine reads
    on. **There is no red anywhere** — a refusal is the policy working.
50. Three typefaces for three worlds: Instrument Sans (product), Newsreader
    (your document), IBM Plex Mono (what the machine sees), all self-hosted via
    `@fontsource`.
51. Four hand-drawn SVG marks (`Avocado.tsx`) with no face, treated as
    standards pictograms; the meter is a real data drawing.
52. `prefers-reduced-motion` honoured; entity list becomes an overlay below
    `lg` so it never squeezes the comparison.

---

## 8. What the browser enforces

The strongest guarantees in this project are not written in TypeScript.

**CSP** — `src/app/layout.tsx` emits it as a `<meta http-equiv>` in production
builds, and both deployment targets send it as a real header
(`server.mjs`, `netlify.toml`):

```
default-src 'self'; connect-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self';
worker-src 'self' blob:; object-src 'none'; base-uri 'none';
form-action 'none'; frame-ancestors 'none'
```

`connect-src 'none'` is the load-bearing directive: the page cannot open a
network connection at all — no fetch, no XHR, no WebSocket, no beacon. Anyone
can confirm it from the Network tab in seconds, which is a stronger claim than
any sentence in a README.

**`Origin-Agent-Cluster: ?1`** — WebMCP is exposed only to origin-isolated
documents. Without it `registerTool()` rejects, and the page would announce
tools no agent can reach. Sent by both targets.

Also sent: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`
(plus a `<meta name="referrer">`), and `Cross-Origin-Opener-Policy: same-origin`
from `server.mjs`.

**Runtime traps** — `src/lib/guards.ts`, production only (the dev server needs
its websocket). `fetch`, `XMLHttpRequest.open`, `WebSocket`, `sendBeacon`,
`localStorage.setItem`, `sessionStorage.setItem` and `indexedDB.open` are
replaced with functions that record a violation and refuse. They sit *behind*
the CSP and exist to make an attempt visible in the interface instead of silent
in a console nobody opens.

**Deliberate consequence:** closing the tab is the delete button. Nothing is
written to disk except a file the user explicitly downloads.

---

## 9. Verification

`npm run verify` (`scripts/verify-core.ts`) turns the README's claims into 37
assertions over the real modules and the bundled sample, and exits non-zero on
failure. Current run: **all 37 pass.**

Grouped: detection (9), token stability (2), redaction (7), decoding (2),
sectioning (4), search (3), measurement (3), a leak sweep over every
section (1), and consent (6).

The ones that matter most:

- `searching a redacted name returns nothing (no oracle)` — the search channel
  is genuinely closed.
- `a surname used alone is still substituted` — alias coverage works on a
  sentence the detector never saw.
- `decode does not restore blocked values` — withheld is irreversible.
- `no section leaks a non-visible value after scrubbing` — every section of the
  sample, through `scrub()`, then re-verified.
- `structural keys are not billed` / `billed text is the redacted text` — the
  accounting measures the redacted output, not the source.
- `oversized results are truncated to the cap` — 9 000 B into a 1 024 B cap.
- `a concurrent write is reported busy, never declined` — the record does not
  claim a person refused something no person was shown.
- `body text is never promoted to a heading` — 14 lines of heading grammar,
  because a mis-promoted title travels through the outline's free channel.

Measured on the bundled sample (`fictional-services-agreement.md`, 3 784 B,
10 sections, 156 B of titles): **38 entities** — 10 dates, 6 people, 5 amounts,
4 organizations, 3 emails, 3 references, 2 locations, 2 phones, 1 IBAN, 1 card,
1 long id. Two default to withheld (IBAN, card), 36 to token, for 44
substitutions once recurrences are counted.

### Where the last two fixes came from

Both were found by pointing a real agent at the deployed app — Gemini 3.6 Flash
through Chrome's WebMCP testing extension — rather than by reading the code.
The run made seven calls (outline, three searches, two sections, one write) and
proved three things that had never been exercised outside the in-page console:
substitution held in the unbilled channel (the sample's account-number line had
become a section title, and still went out as `IBAN [BLOCKED_IBAN]`), the
no-oracle `hint` actually steered the model (two empty searches, then a pivot
from `revenue` to `payment`), and the consent modal suspended a call across the
extension boundary.

It also showed that the extension batches tool calls, two per turn, twice. That
is what turned the concurrent-confirmation path from a theoretical edge case
into the ordinary one.

`npx tsx scripts/dump-entities.ts` prints every entity with its token, level,
occurrence count and aliases.

---

## 10. Not built

Stated plainly, because a spec that only lists what works is not a spec.

- **No server, no accounts, no persistence.** By design, not as a gap.
- **No OCR.** A scanned PDF with no text layer is rejected with that reason.
- **No ML-based entity recognition.** Detection is regex plus a capitalization
  heuristic. A misspelling, an abbreviation or an unusual name form can slip
  past it, which is exactly why the review step exists and why everything
  detected is protected by default.
- **No automated browser test for the WebMCP path.** `verify-core.ts` covers
  everything that runs without a browser; registration, the modal and the
  activity bar are exercised by hand in a WebMCP-enabled browser and by the
  in-page console, which uses the identical wrapper.
- **No cross-document token registry.** Opening a second file restarts tokens
  on purpose: `PERSON_01` meaning two different people in one trail would make
  the trail useless as a record.
- **Substitution shrinks the exposed surface, it does not remove it.** An agent
  asking enough questions can reconstruct the whole document, and nothing here
  stops it. What it reconstructs is the pseudonymized version, which is why the
  strip shows every byte rather than pretending to cap them.
- **A pseudonym protects the name, not necessarily the person.** Someone with
  distinctive behaviour stays recognisable by inference. This is stated in the
  interface itself, on the start screen.

---

## 11. Stack, layout, commands

**Stack:** Next.js 16.3.3 (App Router, `output: "export"`), React 19.2.8,
TypeScript 5, Tailwind CSS 4 (`@theme`, no config file), `pdfjs-dist` 6,
`mammoth` 1.12, `@fontsource` for three self-hosted families. Runtime
dependencies: 8. No state library, no UI kit, no analytics, no telemetry.

```
src/app/
  layout.tsx            CSP, fonts, metadata
  page.tsx              landing (/)
  app/page.tsx          workspace (/app): tabs, banners, both views
  globals.css           palette, type, .mark/.machine/.strip/.paper
src/components/         17 components, all listed in §7
src/lib/
  types.ts store.ts useStore.ts useSelection.ts useAutoHide.ts
  actions.ts export.ts guards.ts branding.ts format.ts regex-utils.ts
  tokens.ts redact.ts search.ts sections.ts
  extract/index.ts
  detect/{index,patterns,heuristics,aliases}.ts
  policy/{types,wrapper,measure,confirm}.ts
  webmcp/{api,tools}.ts
scripts/
  copy-pdf-worker.mjs   vendors the pdf.js worker to our own origin
  verify-core.ts        37 assertions, npm run verify
  dump-entities.ts      entity table for the sample
  capture-shots.mjs     the landing page's two screenshots, from a built copy
public/shots/           those screenshots, webp at 1x
```

Roughly 6 500 lines across `src/`.

| Command | Effect |
| --- | --- |
| `npm run dev` | copies the worker, starts `next dev` (no CSP, no guards) |
| `npm run build` | copies the worker, static export to `out/` |
| `npm start` | serves `out/` on `$PORT` (3000 by default) **with the real headers**, via `server.mjs` |
| `npm run verify` | the 28 core assertions |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `eslint` |

`next dev` cannot send these headers — config headers are unsupported with
`output: "export"` — so `npm start` after a build is the only local mode that
behaves like the deployed site, and the only one where the CSP and the runtime
guards are active.

**Deployment targets in the repo:** Netlify (`netlify.toml`, publishes `out/`)
and Railway (`railway.json`, Railpack Node builder: `npm run build` then
`npm start`, `PORT` from the environment). Both serve static files, both send
the same security headers, and Railway runs the same `server.mjs` as the local
preview.

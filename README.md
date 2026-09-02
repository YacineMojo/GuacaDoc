# GuacaDoc

**Give your AI agent the taste, not the recipe.**

A file is loaded into a browser tab and never leaves it. An AI agent reaches it
only through WebMCP tools, and every answer those tools return passes through a
policy layer first: identifying values are replaced by stable tokens, bank
details are withheld outright, and a live strip shows exactly what went out.

The name is the model. An avocado has flesh and a stone. Guacamole keeps the
flesh, loses the stone, and cannot be turned back into an avocado. That is what
an agent receives here: the substance of the document, without the parts that
identify anyone, in a form that does not reconstruct.

Live app: _add your URL here_

---

## The problem

Having an AI analyse a contract, a medical file or an internal document
currently means uploading the whole thing. The user sees a progress bar, not a
disclosure. They cannot tell what was sent, cannot withhold one clause, cannot
tell afterwards what a third party now holds.

The interesting part is that this is no longer necessary. WebMCP lets a page
expose tools to an agent instead of exposing its data. The document can stay
where it is and the agent can ask questions about it. What has been missing is
the layer in between: something that decides, per answer, what is allowed out.

This project is that layer. It is not tied to contracts or to any document
type. It is a generic disclosure-control surface for agents.

## Try it in 60 seconds

1. Open the live URL, press **Open GuacaDoc**, then **Try the sample contract**
   (a fictional services agreement, written for this project). No account, no
   sign-in, nothing uploaded.
2. **Document** tab: your file on the left, the agent's view of it on the
   right, scrolled together. Everything detected is protected from the start —
   if it is marked, it is handled — so a highlight never means "found this,
   doing nothing about it". Click any mark to switch it between *shown*,
   *token* and *withheld*, or use a group header to change a whole type at
   once. Select any text and the marking bar at the top of the window lets you
   classify it; a selection that contains existing marks folds them into one
   entity, which is how a house number, a street and a town become a single
   address behind a single token.
3. **Agent** tab: press **Sample investigation**. Four tool calls run, the
   strip across the top prints what left the tab, and the record logs each call
   with the bytes it served. The meter is a halved avocado: the flesh fills as
   the file is served, and the stone at its centre carries the count of values
   that are never served.
4. Press **Read every section**. The agent takes the whole document, one
   section at a time, and nothing stops it. That is the demonstration: read the
   strip and the key, and see that it has the entire contract and not one
   name.
5. Paste an answer containing tokens into **Read an answer** to put the real
   names back, locally.

Everything above also happens when a real browser agent drives the page. The
in-page console calls the same registered tools through the same wrapper; there
is no privileged path.

## Testing with a real agent

WebMCP needs a browser that exposes `document.modelContext`:

- **ChatGPT's in-app browser** — supported out of the box.
- **Google Chrome 149+** — enable `chrome://flags/#enable-webmcp-testing`.

**The page must be origin-isolated.** WebMCP is exposed only to documents whose
agent cluster is origin-keyed, which means the response has to carry
`Origin-Agent-Cluster: ?1`. Without it `registerTool()` rejects with a
`SecurityError` and an agent has nothing to call, which looks from the outside
exactly like the policy layer doing nothing. The static file server
(`server.mjs`, used by `npm start` and by the deployment) and `netlify.toml`
both send it. `next dev` cannot:
response headers are unsupported alongside `output: export`, so test real agents
against a built copy rather than the dev server.

The header shows `webmcp live` when the API is present, and the tool count next
to it is what the browser confirms it is holding rather than what the page
offered. If any registration was refused, a strip under the header names the
tool and the reason, because a page claiming five live tools above an empty
record is the worst failure this project can have. In every case the five tools
are registered locally and callable from the console in the Agent tab.

Useful prompts once an agent is attached:

- "Outline this document, then tell me what the liability cap is."
- "Who are the parties and what is the total fee?"
- "Keep reading sections until you cannot any more, then summarise."

The agent will answer in tokens, because tokens are all it ever saw.

## Threat model

**What this defends against.** An organization wants staff to use AI assistants
on real work, and does not want the contents of those documents leaving the
machine. The adversary is the ordinary data flow: the upload itself, the
provider's retention, the training pipeline, the breach two years later. It
also covers a *curious* agent that asks for more than it needs.

**What it does not defend against.** A malicious agent with an exfiltration
channel of its own, a compromised browser, or a user who decides to paste the
document somewhere else. Nothing in a web page can stop those, and this one
does not claim to.

### What it guarantees

- No document byte reaches the network from this app. There is no server, no
  API route, and no `fetch` to anything. Production builds ship a
  `Content-Security-Policy` with `connect-src 'none'`, so the browser itself
  refuses to open a connection. You can confirm it in the Network tab.
- Nothing is written to disk. No `localStorage`, no `IndexedDB`, no cookies.
  State lives in tab memory; closing the tab is the delete button.
- No tool returns the whole document. There is no `get_full_text` and adding
  one would defeat every layer above it.
- Substitution is applied by the wrapper, in JavaScript, to every string in
  every tool result. It is not an instruction in a prompt, so a model cannot be
  argued out of it and a prompt injection cannot switch it off.
- Entity detection is local. No remote model sees the text, because sending the
  text to a recognizer would recreate the exact leak this tool exists to close.

### What it does not guarantee

These are real limits, and they are stated here rather than discovered later.

- **Free text is the weak point.** Detection is regular expressions plus a
  capitalization heuristic. A misspelling, an abbreviation, an unusual format
  or a partial mention can escape substitution. The editor exists because the
  detector is fallible: review the marks before letting an agent read.
- **Substitution shrinks the exposed surface, it does not remove it.** An agent
  asking enough questions can reconstruct the whole document, and nothing here
  stops it: rationing a text whose names are already gone protects nobody. What
  it reconstructs is the pseudonymized version, and the record says how much of
  it left.
- **A pseudonym protects the name, not always the person.** An entity with
  distinctive behaviour can remain identifiable by inference. `PERSON_01` who
  signs every contract and lives at `[LOCATION_02]` is not anonymous in any
  meaningful sense.
- **Extraction is imperfect.** PDF text extraction reconstructs lines from
  glyph positions and can misplace them. Scanned PDFs with no text layer are
  rejected outright, because OCR would need a model this app refuses to call.
- **An agent driving this tab can read the screen.** This is the important one.
  WebMCP agents operate a page; they are not limited to the tools it exposes.
  Nothing a browser page can do prevents an agent from reading the DOM or
  taking a screenshot of the window, so GuacaDoc defends the *network* path —
  the upload, the retention, the training set — not the glass. Two consequences
  are built in: the token-to-value key is never rendered until you press
  **Reveal**, so it is absent from the DOM rather than merely blurred, and
  withheld values are not listed anywhere. Keep the Document tab closed while
  an agent works if the source text itself is sensitive.
- **This is not compliance.** No claim is made about any regulation.

## How it works

```
file ──► extract (pdf.js / mammoth / plain)  ─┐
                                              ├─► text + addressable sections
detect (regex + capitalization heuristic) ────┘        (tab memory only)
   │
   ├─► entities ──► levels chosen by the user ──► token registry (stable)
   │
   └─► redactor  ◄─────────────────────────────────────┐
                                                        │
agent ──► document.modelContext ──► registerToolWithPolicy
                                        │
                                        ├─ 1. confirmation, for write tools
                                        ├─ 2. run the handler
                                        ├─ 3. scrub every string in the result
                                        ├─ 4. count the bytes that are leaving
                                        ├─ 5. truncate if over the per-call cap
                                        └─ 6. write the audit line
```

**The wrapper is the only way a tool becomes reachable.** Handlers do not talk
to the agent; `registerToolWithPolicy` does. A handler that returned the entire
document would still come back substituted and would still be on the record,
because scrubbing is not something a handler opts into.

**Everything detected is protected by default**, with bank details withheld
outright. Dates and amounts are usually needed for the analysis and are one
click away from being let through, per type. The alternative — letting some
types through by default — made highlights ambiguous, because a mark that
protects nothing teaches people to trust the ones that do.

**Token stability** is what keeps the analysis worth having. One source value
always maps to one token, everywhere, for the whole session. Randomized
substitution would break any reasoning about who did what. Multi-word names
also contribute their distinctive parts as aliases, so a document that
introduces "Marceline Dubreuil" once and says "Dubreuil" afterwards is covered
in both forms.

**Search runs on the redacted text, never the source.** Otherwise the tool
would be an oracle: an agent could ask for a name and learn from a hit or a
miss whether it appears, with nothing ever being returned. This costs something
real — blocked values are genuinely unfindable — and that is the intended
trade.

**Byte counting is fail-safe.** Every string in a result is billable unless its
key is on the structural list, or a tool explicitly declares it free in its
policy. Forgetting to classify a new field makes it expensive, never free.

### The tools

Five, deliberately. Descriptions are one plain sentence each; they ask for
restraint but they enforce nothing, and the app never depends on how a model
reads them.

| Tool | What it returns | Counted as served |
|---|---|---|
| `get_document_outline` | Section ids, depth, titles, sizes. No body text. | No: structure, not content |
| `search_document` | Matching section ids and short excerpts, from the redacted text | The excerpts |
| `get_section` | One section, after substitution | Yes, capped per call at 4 096 B |
| `get_metrics` | Bytes served, share of the file, calls made | No |
| `add_finding` | Records one observation; requires user approval | No |

There is no session quota. The per-call cap is a response size, not an
allowance: a result above it is truncated rather than refused, so the agent
still gets something usable and can ask for the rest.

## Verify the claims yourself

```bash
npm install
npm run verify   # asserts detection, token stability, redaction, sectioning,
                 # the search oracle closure, byte accounting, truncation and
                 # consent
```

`scripts/verify-core.ts` is the README's claims written as assertions. It runs
in a second and needs no browser.

For the network and storage claims, open the deployed app, open DevTools, and
watch the Network tab while you load a document and run the agent console.
Production builds also install runtime traps that record any attempt to reach
`fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `localStorage` or
`IndexedDB` and surface it as a banner in the interface, in the brown of the
stone. There is no red anywhere in this app: a refusal is the policy working.

## Running locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export into out/
npm run verify   # core assertions
npm run typecheck
```

The dev server does not carry the CSP, because hot reload needs a websocket.
Build and serve `out/` to see the enforced version.

## Deployment

The build is a folder of static files. `server.mjs` serves `out/` and sets the
same CSP as a real response header, which is how `frame-ancestors` becomes
effective. It is the same command locally and in production, so the preview and
the deployment carry an identical header set.

Railway builds it as a Node project: `npm run build` produces `out/`, then
`npm start` serves it on `$PORT`. No Dockerfile is involved.

```bash
railway up
```

Netlify, Vercel, Cloudflare Pages, or any static host: build command
`npm run build`, publish directory `out`. `netlify.toml` is included with the
headers already configured.

## Stack

Next.js 16 in static export mode, React 19, Tailwind v4. `pdf.js` and `mammoth`
for client-side extraction, both bundled. Instrument Sans, Newsreader and IBM
Plex Mono are self-hosted via Fontsource, so the page makes no external request
of any kind — including to Google Fonts. The two pages are linked with plain
anchors rather than `next/link`, because client-side routing would fetch an RSC
payload and this origin is not allowed to fetch anything.

No server runtime, no API routes, no database, no analytics.

## Project layout

```
src/lib/
  detect/      pattern rules, capitalization heuristic, alias derivation
  extract/     pdf.js, mammoth and plain-text extraction
  policy/      the wrapper, byte measurement, truncation, consent
  webmcp/      the browser API adapter and the five tools
  redact.ts    outbound substitution and its verification pass
  tokens.ts    stable token minting
  search.ts    redaction-aware search
  store.ts     the whole application state, in memory
src/components/  the interface, including Avocado.tsx for the mark and meter
src/app/page.tsx         the front page
src/app/app/page.tsx     the workspace
scripts/verify-core.ts   the assertions behind this README
```

## License

MIT. See `LICENSE`.

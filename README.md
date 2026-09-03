# GuacaDoc

**Give your AI agent the taste, not the recipe.**

Let an agent analyse a confidential document without ever giving it the
document. The file opens in a browser tab and never leaves it. An agent reaches
it only through WebMCP tools, and every answer those tools return passes through
a policy layer first: identifying values become stable tokens, bank details are
withheld outright, and a live strip shows exactly what went out.

The name is the model. An avocado has flesh and a stone. Guacamole keeps the
flesh, loses the stone, and cannot be turned back into an avocado.

- **Live app:** <https://guacadoc-production.up.railway.app/>
- **Demo video:** <https://youtu.be/WrWNbH7JaaY>

[![GuacaDoc: an agent reads a contract it is never given](https://img.youtube.com/vi/WrWNbH7JaaY/maxresdefault.jpg)](https://youtu.be/WrWNbH7JaaY)

---

## Why WebMCP

Having an AI read a contract or a medical file currently means uploading the
whole thing, and a server-side MCP tool is no different: it has to be given the
document before it can answer a question about it. That upload is the exact
disclosure this app exists to prevent. Running the tools inside the page is what
makes three things possible:

- **The file never moves.** Extraction, detection and substitution all happen in
  the tab.
- **Consent has somewhere to happen.** A write tool suspends the agent's call on
  a prompt, in front of the person who owns the document.
- **The key stays with you.** Tokens are minted in the tab and reversed in the
  tab. The mapping is never transmitted.

What GuacaDoc adds is the missing layer in between: something that decides, per
answer, what is allowed out. It is not tied to contracts, or to any document
type.

## Try it in 60 seconds

1. Open the live app, press **Open GuacaDoc**, then **Try the sample contract**.
   No account, nothing uploaded.
2. **Document** tab: your file on the left, the agent's view of it on the right,
   scrolled together. Everything detected is protected from the start. Click a
   mark to switch it between *shown*, *token* and *withheld*, or select any text
   to classify it yourself.
3. **Agent** tab: press **Sample investigation**. Four tool calls run, the strip
   prints what left the tab, and the record logs each call with the bytes it
   served.
4. Press **Read every section**. The agent takes the whole document, one section
   at a time, and nothing stops it. That is the demonstration: it ends up with
   the entire contract and not one name.
5. Paste an answer containing tokens into **Read an answer** to put the real
   names back, locally.

The in-page console calls the same registered tools through the same wrapper as
a real browser agent. There is no privileged path.

## Testing with a real agent

WebMCP needs a browser that exposes `document.modelContext`: ChatGPT's in-app
browser, or Chrome 149+ with `chrome://flags/#enable-webmcp-testing`.

**The page must be origin-isolated**, so the response has to carry
`Origin-Agent-Cluster: ?1` or `registerTool()` rejects with a `SecurityError` and
an agent has nothing to call. `server.mjs` and `netlify.toml` send it. `next dev`
cannot, because response headers are unsupported alongside `output: export`, so
test real agents against a built copy rather than the dev server.

The header shows the tool count the *browser* confirms it is holding, not the
count the page offered, and it names any registration that was refused.

Prompts worth trying once an agent is attached: *"Outline this document, then
tell me what the liability cap is."* / *"Who are the parties and what is the
total fee?"* / *"Keep reading sections until you cannot any more, then
summarise."* The agent answers in tokens, because tokens are all it ever saw.

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

- **The wrapper is the only way a tool becomes reachable.** Handlers never talk
  to the agent. A handler that returned the whole document would still come back
  substituted, and would still be on the record.
- **Tokens are stable.** One source value maps to one token everywhere, for the
  whole session, so reasoning about who did what survives. Multi-word names also
  contribute their distinctive parts as aliases, so a document that says
  "Dubreuil" after introducing "Marceline Dubreuil" is covered in both forms.
- **Search runs on the redacted text, never the source.** Otherwise the tool is
  an oracle: an agent asks for a name and learns from a hit or a miss whether it
  appears. Blocked values are genuinely unfindable, and that is the intended
  trade.
- **Byte counting is fail-safe.** Every string in a result is billable unless it
  is declared free, so forgetting to classify a new field makes it expensive,
  never free.

### The tools

| Tool | What it returns | Counted as served |
|---|---|---|
| `get_document_outline` | Section ids, depth, titles, sizes. No body text. | No: structure, not content |
| `search_document` | Matching section ids and short excerpts, from the redacted text | The excerpts |
| `get_section` | One section, after substitution | Yes, capped per call at 4 096 B |
| `get_metrics` | Bytes served, share of the file, calls made | No |
| `add_finding` | Records one observation; requires user approval | No |

Five, deliberately. There is no `get_full_text`, because a tool that returns the
document defeats every layer above it. There is no session quota either: the
per-call cap is a response size, not an allowance, so a long section is truncated
rather than refused.

## What it guarantees

- **No document byte reaches the network.** No server, no API route, no `fetch`.
  Production builds ship `connect-src 'none'`, so the browser itself refuses to
  open a connection.
- **Nothing is written to disk.** No `localStorage`, no `IndexedDB`, no cookies.
  State lives in tab memory, and closing the tab is the delete button.
- **Substitution is code, not a prompt.** It is applied in JavaScript to every
  string in every result, so a model cannot be argued out of it and a prompt
  injection cannot switch it off.
- **Detection is local.** No remote model ever sees the text, because sending it
  to a recognizer would recreate the exact leak this tool exists to close.

## What it does not

Stated here rather than left to be discovered later.

- **An agent driving this tab can read the screen.** WebMCP agents operate a
  page; they are not limited to the tools it exposes. GuacaDoc defends the
  network path, the upload, the retention, the training set, not the glass.
  Hence the key is absent from the DOM until you press **Reveal**, and stays
  locked while an agent is attached.
- **Detection is patterns, not a model.** It over-detects on purpose, and the
  review step exists because it will still miss things: a misspelling, an
  abbreviation or an unusual format can escape it.
- **Substitution shrinks the exposed surface, it does not remove it.** Enough
  narrow questions rebuild the document. What they rebuild is the pseudonymized
  version, and the record says how much of it left.
- **A pseudonym protects the name, not always the person.** `PERSON_01` who
  signs every contract and lives at `[LOCATION_02]` is not anonymous in any
  meaningful sense.
- **No OCR.** A scanned PDF with no text layer is rejected by name, because OCR
  would need a model this app refuses to call.
- **This is not compliance.** No claim is made about any regulation.

## Verify it yourself

```bash
npm install
npm run verify   # 37 assertions: detection, token stability, redaction,
                 # sectioning, the search oracle, byte accounting, consent
```

`scripts/verify-core.ts` is this README's claims written as assertions. It runs
in a second and needs no browser.

For the network and storage claims, open DevTools on the deployed app and watch
the Network tab while you load a document and run the agent console. Production
builds also trap any attempt to reach `fetch`, `XMLHttpRequest`, `WebSocket`,
`sendBeacon`, `localStorage` or `IndexedDB`, and surface it in the interface.

## Run and deploy

```bash
npm install
npm run dev      # localhost:3000, without the CSP: hot reload needs a websocket
npm run build    # static export into out/
npm start        # serves out/ with the real headers, the way it is deployed
```

Deployed on Railway as a Node project: `npm run build`, then `npm start` on
`$PORT`, no Dockerfile involved. Any static host works too (build
`npm run build`, publish `out`), and `netlify.toml` carries the headers already.

## Stack

Next.js 16 in static export mode, React 19, Tailwind v4. `pdf.js` and `mammoth`
are bundled for client-side extraction, and the fonts are self-hosted, so the
page makes no external request of any kind. No server runtime, no API routes, no
database, no analytics.

## License

MIT. See `LICENSE`.

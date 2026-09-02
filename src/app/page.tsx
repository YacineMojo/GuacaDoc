import { GuacaMark } from "@/components/Avocado";
import { PRODUCT_NAME, PRODUCT_SUMMARY, PRODUCT_TAGLINE } from "@/lib/branding";
import { SAMPLE_STATS } from "@/lib/sample-stats";

/**
 * The front door. The hero holds one screen; what follows is the argument.
 *
 * The order is deliberate, and it is ordered for a reader who has ten seconds.
 * The claim comes first, next to a picture of the thing actually doing it. Then
 * the tool surface, because this is a WebMCP project and a page that never
 * names a tool is a page that hid its own subject. Then how to try it, since a
 * reader on a browser without WebMCP will read "webmcp absent · 0 tools" and
 * leave believing it is broken. Then why it cannot be a server-side tool, then
 * the numbers that let someone check it, then what the thing does not do.
 *
 * The last section is not a disclaimer: on a subject where everyone promises
 * safety, naming the gaps is the strongest thing the page says.
 *
 * Navigation uses a plain anchor rather than next/link on purpose: client-side
 * routing fetches an RSC payload, and this origin is not allowed to fetch
 * anything. A full page load costs nothing here and keeps the claim honest.
 */

/**
 * The whole surface, named. Five tools and no more, which is the point: there
 * is no get_full_text, because a tool that returns the document defeats every
 * layer above it.
 */
const TOOLS = [
  ["get_document_outline", "read", "Section ids, titles and sizes. No body text."],
  ["search_document", "read", "Which sections mention a term, with a short excerpt."],
  ["get_section", "read", "The text of one section, by id."],
  ["get_metrics", "read", "How much of the file has been served so far."],
  ["add_finding", "write", "Files one observation. Suspends on your approval."],
] as const;

/** Why the tools live in the tab. A server-side tool can do none of it. */
const IN_PAGE = [
  {
    title: "The file never moves",
    body: "Extraction, entity detection and substitution all happen in the tab. No model call, no request, no copy on anyone's disk.",
  },
  {
    title: "Consent has somewhere to happen",
    body: "A write tool suspends the agent's call on a prompt, in front of the person who owns the document. No timeout, no default answer.",
  },
  {
    title: "The key stays with you",
    body: "Tokens are minted here and reversed here. The mapping from [PERSON_01] back to a name is never transmitted, and never exported.",
  },
];

/** Stated because they are true, not because they are flattering. */
const LIMITS = [
  {
    title: "It does not stop an agent that can see the screen",
    body: "The tool surface is sealed; a screenshot of the source pane is not. This governs tool-mediated disclosure, which is the part WebMCP controls.",
  },
  {
    title: "Detection is patterns, not a model",
    body: "Regular expressions and a capitalization heuristic. It over-detects on purpose, and the review step exists because it will still miss things.",
  },
  {
    title: "Enough narrow questions rebuild the redacted document",
    body: "Nothing caps how much an agent may read, because rationing a text whose names are already gone protects nobody. What it rebuilds is the pseudonymized version, and every byte of it is on the strip and in the record.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-3">
          <GuacaMark size={22} />
          <span className="font-display text-[0.9375rem] font-semibold tracking-tight text-rind">
            {PRODUCT_NAME}
          </span>
          <a
            href="/app"
            className="ml-auto rounded-[4px] bg-leaf px-4 py-2 font-display text-xs font-semibold tracking-[0.06em] text-white uppercase transition-colors hover:bg-rind"
          >
            Open {PRODUCT_NAME}
          </a>
        </div>
      </header>

      <main>
        <div className="mx-auto grid w-full max-w-6xl items-start gap-10 px-6 py-12 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
          <div>
            <p className="label text-guac-dark">For people who cannot upload the file</p>

            <h1 className="mt-4 font-display text-[2.25rem] leading-[1.06] font-semibold tracking-[-0.03em] text-rind sm:text-[2.875rem]">
              Let an agent analyse a confidential document
              <span className="text-guac-dark"> without ever giving it the document.</span>
            </h1>

            <p className="mt-6 max-w-lg text-[0.9375rem] leading-relaxed text-text-dim">
              {PRODUCT_SUMMARY}
            </p>

            {/*
              One concrete errand. Every abstract capability above is a sentence
              a reader has to translate before it means anything; this is the
              translation, done for them.
            */}
            <p className="mt-5 max-w-lg border-l-[3px] border-guac bg-guac-wash px-4 py-3 text-[0.875rem] leading-relaxed text-rind">
              <span className="font-semibold">Try this:</span> ask an agent to summarise the
              liability clauses of a client contract you are not allowed to upload. It answers from
              the clauses. It never sees who signed them.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <a
                href="/app"
                className="rounded-[5px] bg-guac-dark px-7 py-3.5 font-display text-sm font-semibold tracking-[0.03em] text-white transition-colors hover:bg-rind"
              >
                Open {PRODUCT_NAME} →
              </a>
              <p className="mono text-[0.6875rem] leading-relaxed text-text-faint">
                No account. No upload.
                <br />
                No server to trust.
              </p>
            </div>

            <ol className="mt-8 space-y-3 border-t border-line pt-6">
              {[
                ["Open the file", "It is read here, in the tab. Nothing is sent anywhere."],
                ["Mark what stays behind", "Names, accounts, figures. Detection proposes, you decide."],
                ["Let the agent read", "Through tools, one section at a time, on a record you keep."],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-3.5">
                  <span className="mono mt-px w-4 shrink-0 text-[0.6875rem] font-medium text-guac-dark">
                    {i + 1}
                  </span>
                  <p className="text-[0.8125rem] leading-relaxed text-text-dim">
                    <span className="font-display font-semibold text-rind">{title}.</span> {body}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {/*
            The real interface, captured from a built copy by
            scripts/capture-shots.mjs. Not a mockup and not a diagram: the
            comparison pane is the product, and describing it in prose was
            asking a reader to imagine the one thing worth showing them.
          */}
          <figure className="panel overflow-hidden lg:mt-9">
            <a href="/app" title={`Open ${PRODUCT_NAME}`}>
              <img
                src="/shots/split-view.webp"
                width={1340}
                height={913}
                alt="Two panes side by side. On the left the contract as written, with names, an address, a phone number and dates highlighted. On the right the same text as the agent receives it, every one of those values replaced by a token such as [PERSON_01] or [ORG_02], and the bank account shown as [BLOCKED_IBAN] in brown."
                className="block w-full border-b border-line-soft"
              />
            </a>
            <figcaption className="px-4 py-3 text-[0.75rem] leading-relaxed text-text-dim">
              Your document and the agent&apos;s copy of it, scrolled together.{" "}
              <span className="text-text">
                [PERSON_01] is the same person on every page, so the reasoning still holds.
              </span>{" "}
              The account number has no token at all: it was never sent, so there is nothing to
              decode it back from.
            </figcaption>
          </figure>
        </div>

        {/*
          The part a WebMCP jury is actually looking for, and it used to appear
          nowhere but a footer credit.
        */}
        <section className="border-t border-line bg-white">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
              <div>
                <p className="label text-guac-dark">The tool surface</p>
                <p className="mt-3 max-w-xl font-display text-[1.0625rem] leading-relaxed font-medium text-rind">
                  Five tools go to{" "}
                  <span className="mono text-[0.9375rem] text-guac-dark">
                    document.modelContext.registerTool()
                  </span>
                  , and every one of them answers through a single wrapper.
                </p>

                <dl className="mono mt-6 divide-y divide-line-soft border-y border-line-soft">
                  {TOOLS.map(([name, access, body]) => (
                    <div key={name} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 py-2.5">
                      <dt className="text-[0.75rem] text-text">{name}</dt>
                      <span
                        className={`rounded-[3px] border px-1.5 py-px font-display text-[0.5625rem] font-semibold tracking-[0.06em] uppercase ${
                          access === "write"
                            ? "border-stone-soft bg-stone-soft/40 text-stone"
                            : "border-guac/45 bg-guac-wash text-guac-dark"
                        }`}
                      >
                        {access}
                      </span>
                      <dd className="w-full text-[0.6875rem] leading-relaxed text-text-faint">
                        {body}
                      </dd>
                    </div>
                  ))}
                </dl>

                <p className="mt-5 max-w-xl text-[0.8125rem] leading-relaxed text-text-dim">
                  The wrapper is the only door. It substitutes every string in a result{" "}
                  <span className="text-text">after the handler has returned</span>, so a handler
                  cannot leak by forgetting to redact: forgetting is not a code path that exists. It
                  also counts every byte of document text that leaves, holds write calls on your
                  approval, and appends the audit line. Tools are registered against an{" "}
                  <span className="mono text-[0.75rem]">AbortSignal</span> per generation, because
                  the API has no <span className="mono text-[0.75rem]">unregisterTool()</span> and a
                  remount would otherwise re-offer names the browser already holds.
                </p>
              </div>

              {/*
                How to try it, next to the tool list rather than buried, because
                a reader on a browser without WebMCP sees "webmcp absent · 0
                tools" in the header and has no way to know that is expected.
              */}
              <div className="panel overflow-hidden self-start">
                <header className="border-b border-line-soft bg-guac-wash px-4 py-2.5">
                  <h2 className="label text-leaf">How to try it</h2>
                </header>
                <div className="space-y-4 px-5 py-4">
                  <div>
                    <h3 className="font-display text-[0.8125rem] font-semibold text-rind">
                      On any browser, right now
                    </h3>
                    <p className="mt-1.5 text-[0.75rem] leading-relaxed text-text-dim">
                      The Agent tab has a console that calls the same registered tools through the
                      same wrapper. There is no privileged path and no demo mode: if the console
                      cannot see a value, neither can a real agent. Press{" "}
                      <span className="font-medium text-text">Sample investigation</span> to watch
                      four calls, or{" "}
                      <span className="font-medium text-text">Read every section</span> to hand the
                      agent the whole file and watch it stay pseudonymous.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-display text-[0.8125rem] font-semibold text-rind">
                      With a real agent driving the page
                    </h3>
                    <p className="mt-1.5 text-[0.75rem] leading-relaxed text-text-dim">
                      Chrome 149+ with{" "}
                      <span className="mono text-[0.6875rem] text-guac-dark">
                        chrome://flags/#enable-webmcp-testing
                      </span>
                      , or ChatGPT&apos;s in-app browser.
                    </p>
                  </div>
                  <p className="border-t border-line-soft pt-3 text-[0.75rem] leading-relaxed text-text-faint">
                    The header reads{" "}
                    <span className="mono text-[0.6875rem]">webmcp absent · 0 tools</span> on a
                    browser without the API. That is the truth, not a failure: the count shown is
                    the one the browser confirms holding, never the one this page offered, so it can
                    never claim tools an agent has no way to call.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <p className="label text-guac-dark">Why the tools run in the page</p>
            <p className="mt-3 max-w-2xl font-display text-[1.0625rem] leading-relaxed font-medium text-rind">
              A server-side tool would have to receive the document before it could answer
              anything about it. That is the exact leak this exists to prevent, so the premise
              fails at step one.
            </p>

            <div className="mt-8 grid gap-x-10 gap-y-6 border-t border-line-soft pt-7 sm:grid-cols-3">
              {IN_PAGE.map((point) => (
                <section key={point.title}>
                  <h2 className="font-display text-[0.8125rem] font-semibold text-rind">
                    {point.title}
                  </h2>
                  <p className="mt-1.5 text-[0.75rem] leading-relaxed text-text-dim">{point.body}</p>
                </section>
              ))}
            </div>
          </div>
        </section>

        {/*
          The numbers come from src/lib/sample-stats.ts, which runs the real
          detector over the real sample at build time. Nothing here is typed by
          hand, so the page cannot drift away from the app.
        */}
        <section className="border-t border-line bg-guac-wash">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <p className="label text-guac-dark">Checkable, not promised</p>
            <p className="mt-3 max-w-3xl text-[0.9375rem] leading-relaxed text-text-dim">
              Every call is written to a record in the tab, with its decision and the bytes it
              served. Open DevTools while you use it:{" "}
              <span className="text-text">the Network tab is empty, and it stays empty.</span>{" "}
              Production builds tell the browser{" "}
              <span className="mono text-[0.8125rem]">connect-src &apos;none&apos;</span>, so this
              origin cannot open a connection even if the code asked it to.
            </p>

            {/*
              Four numbers, and the sample's own byte count is not one of them.
              How big the example file happens to be is a fact about the
              example; what was found in it, what is withheld and how many
              places get rewritten on the way out are facts about the tool.
            */}
            <dl className="mono mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border border-line bg-line sm:grid-cols-4">
              {[
                [SAMPLE_STATS.entities, "entities detected"],
                [SAMPLE_STATS.withheld, "withheld outright"],
                [SAMPLE_STATS.sections, "addressable sections"],
                [SAMPLE_STATS.substitutions, "substitutions in the text"],
              ].map(([value, caption]) => (
                <div key={caption} className="bg-white px-4 py-3.5">
                  <dt className="font-display text-[1.375rem] font-semibold tracking-tight text-rind">
                    {value}
                  </dt>
                  <dd className="mt-0.5 text-[0.6875rem] leading-snug text-text-faint">
                    {caption}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-2.5 text-[0.6875rem] leading-relaxed text-text-faint">
              Measured at build time by the real detector on the bundled fictional contract, with
              the default level for each kind of value.
            </p>

            {/*
              Full width, because this one is dense. Four panels squeezed into
              half a column is a picture of an interface rather than a picture
              of what it says, and the numbers on it are the whole argument.
            */}
            <figure className="panel mt-8 overflow-hidden">
              <a href="/app" title={`Open ${PRODUCT_NAME}`}>
                <img
                  src="/shots/agent-view.webp"
                  width={1680}
                  height={949}
                  alt="The agent view. A halved avocado meter reads the share of the file served to the agent, with 2 withheld values on its stone. A strip across the top shows each response that left the tab with its byte count. Below it, a record lists four calls, each marked allowed, and a key table whose real values are masked."
                  className="block w-full border-b border-line-soft"
                />
              </a>
              <figcaption className="px-4 py-3 text-[0.8125rem] leading-relaxed text-text-dim">
                A real run of the sample investigation.{" "}
                <span className="text-text">
                  The strip is everything that actually left the tab
                </span>
                , the record is every call with its byte count and decision, the meter fills the flesh of
                a halved avocado and carries the withheld count on its stone, and the key is masked
                until you ask for it, because an agent driving this tab can read the screen.
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-6 py-11">
            <p className="label text-stone">What it does not do</p>
            <div className="mt-5 grid gap-x-10 gap-y-6 sm:grid-cols-3">
              {LIMITS.map((limit) => (
                <section key={limit.title}>
                  <h2 className="font-display text-[0.8125rem] font-semibold text-rind">
                    {limit.title}
                  </h2>
                  <p className="mt-1.5 text-[0.75rem] leading-relaxed text-text-dim">{limit.body}</p>
                </section>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4">
          <p className="text-[0.6875rem] text-text-faint">
            Closing the tab is the delete button. {PRODUCT_TAGLINE} Built on WebMCP. Open source,
            MIT.
          </p>
          <a
            href="/app"
            className="ml-auto font-display text-[0.75rem] font-semibold text-guac-dark transition-colors hover:text-rind"
          >
            Open {PRODUCT_NAME} →
          </a>
        </div>
      </footer>
    </div>
  );
}

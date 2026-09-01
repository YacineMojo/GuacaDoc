import { GuacaMark } from "@/components/Avocado";
import { SampleTransform } from "@/components/SampleTransform";
import { PRODUCT_NAME, PRODUCT_SUMMARY, PRODUCT_TAGLINE } from "@/lib/branding";
import { SAMPLE_STATS } from "@/lib/sample-stats";

/**
 * The front door. The hero holds one screen; what follows is the argument.
 *
 * The order is deliberate. The claim comes first, then why it cannot be made
 * by a server-side tool, then the numbers that let someone check it, then what
 * the thing does not do. The last section is not a disclaimer: on a subject
 * where everyone promises safety, naming the gaps is the strongest thing the
 * page says.
 *
 * Navigation uses a plain anchor rather than next/link on purpose: client-side
 * routing fetches an RSC payload, and this origin is not allowed to fetch
 * anything. A full page load costs nothing here and keeps the claim honest.
 */

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
    title: "Enough narrow questions rebuild part of the document",
    body: "Up to the budget, and no further. That is what the budget is for, and why every byte that leaves is on the strip and in the record.",
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

      <main className="flex flex-1 items-center">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <p className="label text-guac-dark">For people who cannot upload the file</p>

            <h1 className="mt-4 font-display text-[2.25rem] leading-[1.06] font-semibold tracking-[-0.03em] text-rind sm:text-[2.875rem]">
              Let an agent analyse a confidential document
              <span className="text-guac-dark"> without ever giving it the document.</span>
            </h1>

            <p className="mt-6 max-w-lg text-[0.9375rem] leading-relaxed text-text-dim">
              {PRODUCT_SUMMARY}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
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

            {/* A real sequence, so it gets real numbers. */}
            <ol className="mt-9 space-y-3 border-t border-line pt-6">
              {[
                ["Open the file", "It is read here, in the tab. Nothing is sent anywhere."],
                ["Mark what stays behind", "Names, accounts, figures. Detection proposes, you decide."],
                ["Let the agent read", "Through tools, inside a budget you set, on a record you keep."],
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

          <SampleTransform />
        </div>
      </main>

      <section className="border-t border-line bg-white">
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
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <p className="label text-guac-dark">Checkable, not promised</p>
            <p className="text-[0.8125rem] leading-relaxed text-text-dim">
              Every call is written to a record in the tab, with its decision and its billable
              bytes. Open DevTools while you use it: the Network tab is empty, and it stays
              empty.
            </p>
          </div>

          <dl className="mono mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border border-line bg-line sm:grid-cols-5">
            {[
              [SAMPLE_STATS.bytes.toLocaleString("en-US"), "bytes in the sample"],
              [SAMPLE_STATS.sections, "addressable sections"],
              [SAMPLE_STATS.entities, "entities detected"],
              [SAMPLE_STATS.withheld, "withheld outright"],
              [SAMPLE_STATS.budgetBytes.toLocaleString("en-US"), "bytes the agent may spend"],
            ].map(([value, caption]) => (
              <div key={caption} className="bg-white px-4 py-3.5">
                <dt className="font-display text-[1.125rem] font-semibold tracking-tight text-rind">
                  {value}
                </dt>
                <dd className="mt-0.5 text-[0.6875rem] leading-snug text-text-faint">{caption}</dd>
              </div>
            ))}
          </dl>
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

      {/*
        The footer used to restate three facts that the sections above now make
        better and with numbers. What is left is the one line worth ending on,
        and a way back in.
      */}
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

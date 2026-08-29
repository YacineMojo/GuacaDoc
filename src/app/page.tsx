import { GuacaMark } from "@/components/Avocado";
import { SampleTransform } from "@/components/SampleTransform";
import { PRODUCT_NAME, PRODUCT_SUMMARY, PRODUCT_TAGLINE } from "@/lib/branding";

/**
 * The front door. One screen, three facts, one way in.
 *
 * Navigation uses a plain anchor rather than next/link on purpose: client-side
 * routing fetches an RSC payload, and this origin is not allowed to fetch
 * anything. A full page load costs nothing here and keeps the claim honest.
 */
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

            <h1 className="mt-4 font-display text-[2.75rem] leading-[1.04] font-semibold tracking-[-0.03em] text-rind sm:text-[3.5rem]">
              Give your AI agent
              <br />
              the taste,
              <span className="text-guac-dark"> not the recipe.</span>
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

      <footer className="border-t border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-x-10 gap-y-6 px-6 py-7 sm:grid-cols-3">
          {[
            {
              title: "It stays in the tab",
              body: "There is no server to send it to. Production builds tell the browser to refuse any outbound connection, so you can check that in DevTools rather than take our word for it.",
            },
            {
              title: "Names become tokens",
              body: "One value, one token, everywhere in the document. The agent reasons about [PERSON_01] and answers in kind. The key stays on your side.",
            },
            {
              title: "You decide how much leaves",
              body: "A byte budget, set as a share of the file. When it runs out the tools refuse and say why, in a form the agent can act on.",
            },
          ].map((fact) => (
            <section key={fact.title}>
              <h2 className="font-display text-[0.8125rem] font-semibold text-rind">{fact.title}</h2>
              <p className="mt-1.5 text-[0.75rem] leading-relaxed text-text-dim">{fact.body}</p>
            </section>
          ))}
        </div>
        <div className="border-t border-line-soft">
          <p className="mx-auto max-w-6xl px-6 py-3 text-[0.6875rem] text-text-faint">
            {PRODUCT_TAGLINE} Built on WebMCP. Open source, MIT.
          </p>
        </div>
      </footer>
    </div>
  );
}

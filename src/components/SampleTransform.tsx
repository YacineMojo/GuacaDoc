"use client";

/**
 * The product in one glance: the same three lines, as a person reads them and
 * as an agent receives them.
 *
 * The markup and the colours are the ones the live panes use, so this is a
 * preview rather than an illustration.
 */
const AGENT_LINE =
  "Payment shall be made to [ORG_02], account [BLOCKED_IBAN], on the instruction of [PERSON_01]. Total EUR 184,500.";
const AGENT_LINE_BYTES = new TextEncoder().encode(AGENT_LINE).length;

export function SampleTransform() {
  return (
    <figure className="border border-line-soft">
      <figcaption className="flex items-center justify-between border-b border-line-soft bg-ink-800 px-3 py-1.5">
        <span className="label">In your tab</span>
        <span className="label">clause 4 · extract</span>
      </figcaption>

      <div className="paper px-5 py-4 text-[0.8125rem]">
        Payment shall be made to <span className="mark mark-pseudonymized">Kaltbrunn Analytics Ltd</span>,
        account <span className="mark mark-blocked">GB29 NWBK 6016 1331 9268 19</span>, on the
        instruction of <span className="mark mark-pseudonymized">Marceline Dubreuil</span>. Total{" "}
        <span className="mark mark-visible">EUR 184,500</span>.
      </div>

      <div className="flex items-center gap-2 border-y border-line-soft bg-ink-800 px-3 py-1.5">
        <span className="label">Sent to the agent</span>
        <span className="mono text-[0.625rem] text-text-faint">
          ↓ {AGENT_LINE_BYTES} bytes charged to the budget
        </span>
      </div>

      <div className="mono bg-ink-900 px-5 py-4 text-[0.75rem] leading-relaxed text-text-dim">
        Payment shall be made to <span className="bg-marker/20 px-1 font-medium text-marker">[ORG_02]</span>,
        account <span className="bg-stamp px-1 font-medium text-paper">[BLOCKED_IBAN]</span>, on the
        instruction of <span className="bg-marker/20 px-1 font-medium text-marker">[PERSON_01]</span>. Total
        EUR 184,500.
      </div>

      <div className="border-t border-line-soft bg-ink-850 px-5 py-3">
        <p className="text-[0.6875rem] leading-relaxed text-text-dim">
          <span className="text-marker">[PERSON_01]</span> means the same person
          everywhere in the document, so the agent can still follow who did what.
          The account number has no token at all: it was never sent, so there is
          nothing to decode it back from.
        </p>
      </div>
    </figure>
  );
}

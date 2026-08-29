"use client";

import { AvocadoWhole, GuacamoleBowl } from "./Avocado";

/**
 * The product in one glance: three lines of a contract, as you read them and
 * as an agent receives them.
 *
 * The markup and colours are the ones the live panes use, so this is a preview
 * rather than an illustration of one.
 */
const AGENT_LINE =
  "Payment shall be made to [ORG_02], account [BLOCKED_IBAN], on the instruction of [PERSON_01]. Total EUR 184,500.";
const AGENT_LINE_BYTES = new TextEncoder().encode(AGENT_LINE).length;

export function SampleTransform() {
  return (
    <figure className="panel overflow-hidden">
      <figcaption className="flex items-center gap-2 border-b border-line-soft bg-guac-wash px-4 py-2.5">
        <AvocadoWhole size={18} />
        <span className="label text-leaf">Your file, in this tab</span>
      </figcaption>

      <div className="paper px-5 py-4">
        Payment shall be made to{" "}
        <span className="mark mark-pseudonymized">Kaltbrunn Analytics Ltd</span>, account{" "}
        <span className="mark mark-blocked">GB29 NWBK 6016 1331 9268 19</span>, on the instruction
        of <span className="mark mark-pseudonymized">Marceline Dubreuil</span>. Total{" "}
        <span className="mark mark-visible">EUR 184,500</span>.
      </div>

      <div className="flex items-center gap-2 border-y border-dark-line bg-dark-soft px-4 py-2.5">
        <GuacamoleBowl size={20} />
        <span className="label text-dark-dim">What the agent receives</span>
        <span className="mono ml-auto text-[0.625rem] text-dark-dim">
          {AGENT_LINE_BYTES} B of your budget
        </span>
      </div>

      <div className="machine px-5 py-4 text-[0.75rem] leading-relaxed">
        Payment shall be made to <span className="machine-token">[ORG_02]</span>, account{" "}
        <span className="machine-stone">[BLOCKED_IBAN]</span>, on the instruction of{" "}
        <span className="machine-token">[PERSON_01]</span>. Total EUR 184,500.
      </div>

      <div className="border-t border-line-soft px-5 py-3.5">
        <p className="text-[0.8125rem] leading-relaxed text-text-dim">
          Same meaning, same figures.{" "}
          <span className="text-text">[PERSON_01]</span> is the same person on every page, so the
          analysis still holds together, and only you hold the key. The account number has no token
          at all: it was never sent, so there is nothing to decode it back from.
        </p>
      </div>
    </figure>
  );
}

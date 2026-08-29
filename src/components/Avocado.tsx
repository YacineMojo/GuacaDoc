"use client";

/**
 * The mark, drawn as a diagram rather than a character.
 *
 * No eyes, no smile, no arms. The subject is already unusual enough; treating
 * it like a standards pictogram is what keeps the joke from swallowing the
 * product. Every shape here carries a meaning used elsewhere in the interface:
 * flesh is what an agent receives, the stone is what it never does.
 */

/**
 * The silhouette widens continuously from a rounded top to a broad base.
 * A narrow neck on a round bulb reads as a cherry, which is the failure mode
 * this shape was drawn to avoid.
 */
const WHOLE =
  "M26 2.5c6.4 0 10.2 6 9.6 13.5C45.1 21.5 49 31 47.5 41c-1.5 11.5-10.5 20.5-21.5 20.5S6 52.5 4.5 41C3 31 6.9 21.5 16.4 16 15.8 8.5 19.6 2.5 26 2.5Z";
const FLESH =
  "M26 8.6c4.2 0 6.7 4.3 6.3 9.7 8.3 4.8 11.6 12.7 10.3 21.4C41.3 49.4 34.8 56 26 56s-15.3-6.6-16.6-16.3C8.1 31 11.4 23.1 19.7 18.3 19.3 12.9 21.8 8.6 26 8.6Z";

/** The document as it sits in your tab: whole, stone still inside. */
export function AvocadoWhole({ className = "", size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 52 64"
      width={size}
      height={(size / 52) * 64}
      className={className}
      aria-hidden
      fill="none"
    >
      <path d={WHOLE} fill="var(--color-skin)" />
      <path d={FLESH} fill="var(--color-flesh)" />
      <ellipse cx="26" cy="41.5" rx="9.4" ry="9.9" fill="var(--color-stone)" />
    </svg>
  );
}

/**
 * What the agent gets: the flesh, mashed, with the stone taken out.
 * The bowl is deliberately plain tableware, not a cartoon prop.
 */
export function GuacamoleBowl({ className = "", size = 26 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 48 40" width={size} height={(size / 48) * 40} className={className} aria-hidden fill="none">
      <path
        d="M3 15.5h42c.6 0 1 .5 1 1.1C45.3 28.9 35.6 38 24 38S2.7 28.9 2 16.6c0-.6.4-1.1 1-1.1Z"
        fill="var(--color-bowl)"
      />
      <ellipse cx="24" cy="15.5" rx="21" ry="6.4" fill="var(--color-guac)" />
      <path
        d="M13.5 14.2a2.2 2.2 0 1 1 4.4 0 2.2 2.2 0 0 1-4.4 0Zm8.3 3.4a1.7 1.7 0 1 1 3.4 0 1.7 1.7 0 0 1-3.4 0Zm7.4-3.9a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z"
        fill="var(--color-guac-dark)"
      />
    </svg>
  );
}

/**
 * The disclosure meter: a halved avocado seen in section.
 *
 * The flesh fills with served guacamole as the budget is spent, so the drawing
 * and the percentage read the same direction. The stone at the centre never
 * fills, and carries the count of values that were withheld outright — it is
 * the one part of the document that is never served, in the picture and in the
 * policy alike.
 */
export function AvocadoMeter({
  spentRatio,
  withheldCount,
  size = 168,
}: {
  spentRatio: number;
  withheldCount: number;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(1, spentRatio));
  const over = clamped >= 1;
  // Flesh spans roughly y=8.6 to y=56 in the viewBox.
  const top = 56 - clamped * 47.4;

  return (
    <svg
      viewBox="0 0 52 64"
      width={size}
      height={(size / 52) * 64}
      role="img"
      aria-label={`${Math.round(clamped * 100)} percent of the disclosure budget spent`}
      fill="none"
    >
      <defs>
        <clipPath id="guac-flesh">
          <path d={FLESH} />
        </clipPath>
      </defs>

      <path d={WHOLE} fill={over ? "var(--color-stone)" : "var(--color-skin)"} />
      <path d={FLESH} fill="var(--color-flesh)" />

      <g clipPath="url(#guac-flesh)">
        <rect
          x="0"
          y={top}
          width="52"
          height="64"
          fill="var(--color-guac)"
          style={{ transition: "y 320ms cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </g>

      <ellipse cx="26" cy="41.5" rx="9.4" ry="9.9" fill="var(--color-stone)" />
      <text
        x="26"
        y="41.5"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--color-stone-text)"
        style={{ font: "600 9px var(--font-display)" }}
      >
        {withheldCount}
      </text>
    </svg>
  );
}

/**
 * The logo. Two shapes only.
 *
 * At 22 pixels the flesh ring collapses to nothing, so it is not drawn: an
 * avocado is recognisable from its silhouette and its stone alone, and a mark
 * that needs a third colour to read is not a mark.
 */
export function GuacaMark({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 52 64" width={size} height={(size / 52) * 64} aria-hidden fill="none">
      <path d={WHOLE} fill="var(--color-guac-dark)" />
      <ellipse cx="26" cy="41.5" rx="9.8" ry="10.3" fill="var(--color-stone)" />
    </svg>
  );
}

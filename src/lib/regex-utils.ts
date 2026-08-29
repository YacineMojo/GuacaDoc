/**
 * A value read out of a document may be wrapped across a line break:
 * "Pelmont\nMutual SA" is the same company as "Pelmont Mutual SA". Entity
 * values are stored with whitespace collapsed, so every pattern built from a
 * value has to match any run of whitespace where the value has one space.
 */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Escaped pattern for a value, tolerant to how its whitespace was wrapped. */
export function flexibleSource(value: string): string {
  return value
    .split(/\s+/)
    .map(escapeRegExp)
    .join("\\s+");
}

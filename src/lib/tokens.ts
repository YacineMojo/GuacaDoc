import type { EntityType } from "./types";

/**
 * Token stability is the property that makes the whole thing useful.
 *
 * The same source value must always map to the same token, everywhere in the
 * document and for the whole session. If "Marceline Dubreuil" were replaced by
 * a different token on each occurrence, the agent could no longer tell that
 * the signatory of section 2 is the same person named in section 7, and any
 * reasoning it produced would be worthless.
 *
 * Tokens are assigned in order of first appearance, per type, so they also
 * read naturally in the agent's answer.
 */

const registry = new Map<string, string>();
const counters = new Map<EntityType, number>();

const PREFIX: Record<EntityType, string> = {
  person: "PERSON",
  org: "ORG",
  email: "EMAIL",
  phone: "PHONE",
  iban: "IBAN",
  card: "CARD",
  date: "DATE",
  amount: "AMOUNT",
  reference: "REF",
  location: "LOCATION",
  id: "ID",
  custom: "ITEM",
};

/** Collapses surface variations so that variants share one token. */
export function normalizeValue(type: EntityType, value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  switch (type) {
    case "email":
      return trimmed.toLowerCase();
    case "iban":
      return trimmed.replace(/\s+/g, "").toUpperCase();
    case "card":
      return trimmed.replace(/[^\d]/g, "");
    case "phone": {
      let digits = trimmed.replace(/[^\d+]/g, "");
      digits = digits.replace(/^\+/, "");
      // +33 6 12 34 56 78 and 06 12 34 56 78 are the same subscriber.
      if (digits.length === 11 && digits.startsWith("33")) digits = "0" + digits.slice(2);
      if (digits.length === 12 && digits.startsWith("47")) digits = digits.slice(2);
      return digits;
    }
    case "amount":
      return trimmed.replace(/[ \s]/g, "").replace(/,/g, ".").toUpperCase();
    case "person":
    case "org":
    case "location":
      return trimmed.toLowerCase().replace(/[.,;:]+$/, "");
    default:
      return trimmed.toLowerCase();
  }
}

/** Returns the token for a normalized key, minting a new one if needed. */
export function tokenFor(type: EntityType, key: string): string {
  const registryKey = `${type}:${key}`;
  const existing = registry.get(registryKey);
  if (existing) return existing;

  const next = (counters.get(type) ?? 0) + 1;
  counters.set(type, next);
  const token = `[${PREFIX[type]}_${String(next).padStart(2, "0")}]`;
  registry.set(registryKey, token);
  return token;
}

/** The placeholder used for entities the user marked as blocked. */
export function blockedMarker(type: EntityType): string {
  return `[BLOCKED_${PREFIX[type]}]`;
}

/** Matches any token this module can mint, for the decoder. */
export const TOKEN_PATTERN = /\[[A-Z]+_\d{2,}\]/g;

export function resetTokenRegistry() {
  registry.clear();
  counters.clear();
}

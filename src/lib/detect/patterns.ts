import type { EntityType } from "../types";

/**
 * Local pattern detection. No model, no network, on purpose: sending the
 * document to a remote recognizer would recreate the exact leak this tool
 * exists to prevent.
 *
 * Order matters. When two patterns overlap, the one listed first wins, so the
 * specific formats are declared before the greedy numeric ones.
 */
export interface PatternRule {
  type: EntityType;
  label: string;
  regex: RegExp;
  /** Optional rejection pass for matches the regex cannot exclude alone. */
  reject?: (match: string) => boolean;
}

const MONTHS_EN =
  "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec";
const MONTHS_FR =
  "janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre";

export const PATTERN_RULES: PatternRule[] = [
  {
    type: "email",
    label: "Email address",
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/g,
  },
  {
    type: "iban",
    label: "IBAN",
    regex: /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,3})?\b/g,
    // An IBAN is at least 15 characters once spaces are removed.
    reject: (m) => m.replace(/\s/g, "").length < 15,
  },
  {
    type: "card",
    label: "Payment card",
    regex: /\b(?:\d{4}[ -]){3}\d{4}\b/g,
  },
  {
    type: "phone",
    label: "Phone number",
    // French national and +33, plus a generic international form.
    regex: /(?:\+33[ .-]?|\b0)[1-9](?:[ .-]?\d{2}){4}\b|\+\d{1,3}[ .-]?\d{2,4}(?:[ .-]?\d{2,4}){1,4}\b/g,
    reject: (m) => m.replace(/[^\d]/g, "").length < 8,
  },
  {
    type: "location",
    label: "Postal address",
    /*
     * An address is one entity, not three. Matching the house number, the
     * street and the town together is what lets a single token stand for the
     * whole thing; matching only the town would leave the street in the
     * outbound text, which is the part that actually locates someone.
     *
     * Two shapes: French "9 rue des Ateliers, 59300 Vaubercourt" and English
     * "41 Harrowgate Row, Elverstoke". The town half is optional in both.
     */
    regex: new RegExp(
      // French: number, street type, street name, optional postcode and town
      "\\d{1,4}(?:[ ](?:bis|ter))?[ ]" +
        "(?:rue|avenue|av\\.|boulevard|bd|impasse|all[ée]e|place|chemin|route|quai|voie|cours)" +
        "[ ](?:(?:de|des|du|la|le|l')[ ])?(?:[\\p{L}'-]+[ ]){0,2}[\\p{L}'-]+" +
        "(?:,[ ]*\\d{4,5}[ ][\\p{Lu}][\\p{L}'-]+(?:[ -][\\p{Lu}][\\p{L}'-]+)*)?" +
        "|" +
        // English: number, name, street type, optional town
        "\\d{1,4}[ ][\\p{Lu}][\\p{L}'-]*(?:[ ][\\p{Lu}][\\p{L}'-]*){0,2}[ ]" +
        "(?:Street|St|Road|Rd|Row|Lane|Ln|Avenue|Ave|Drive|Dr|Way|Square|Sq|Court|Ct|Close|Place|Pl)" +
        "\\b(?:,[ ]*[\\p{Lu}][\\p{L}'-]+)?",
      "giu",
    ),
  },
  {
    type: "location",
    label: "Postcode and town",
    // Only fires where no full address matched, since that rule is declared
    // first and wins the overlap.
    regex: /(?<![-/\d])\b\d{4,5}[ ][\p{Lu}][\p{L}'-]+(?:[ -][\p{Lu}][\p{L}'-]+)*/gu,
  },
  {
    type: "amount",
    label: "Monetary amount",
    regex: new RegExp(
      "(?:[€$£]|\\b(?:EUR|USD|GBP|NOK|CHF)\\b)\\s?\\d[\\d  .,]*\\d?" +
        "|\\b\\d[\\d  .,]*\\s?(?:[€$£]|EUR|USD|GBP|NOK|CHF|euros?|dollars?)\\b",
      "gi",
    ),
  },
  {
    type: "date",
    label: "Date",
    regex: new RegExp(
      "\\b\\d{4}-\\d{2}-\\d{2}\\b" +
        "|\\b\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{2,4}\\b" +
        `|\\b(?:${MONTHS_EN})\\.?\\s\\d{1,2}(?:st|nd|rd|th)?,?\\s\\d{4}\\b` +
        `|\\b\\d{1,2}(?:st|nd|rd|th)?\\s(?:${MONTHS_EN})\\.?,?\\s\\d{4}\\b` +
        `|\\b\\d{1,2}(?:er)?\\s(?:${MONTHS_FR})\\s\\d{4}\\b`,
      "gi",
    ),
  },
  {
    type: "reference",
    label: "Reference number",
    // Contract, invoice and purchase-order style identifiers.
    regex: /\b[A-Z]{2,6}[-/][A-Z0-9]{2,}(?:[-/][A-Z0-9]{1,6})*\b|\b[A-Z]{2,6}\d{4,}\b/g,
  },
  {
    type: "id",
    label: "Long numeric identifier",
    regex: /\b\d{9,}\b/g,
  },
];

export interface RawMatch {
  type: EntityType;
  value: string;
  start: number;
  end: number;
  priority: number;
}

/** Runs every rule over the text and returns matches with their offsets. */
export function findPatternMatches(text: string): RawMatch[] {
  const out: RawMatch[] = [];
  PATTERN_RULES.forEach((rule, priority) => {
    const regex = new RegExp(rule.regex.source, rule.regex.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      // Trailing punctuation belongs to the sentence, not to the value.
      const value = match[0].trim().replace(/[.,;:]+$/, "");
      if (!value) continue;
      if (rule.reject?.(value)) continue;
      const start = match.index + match[0].indexOf(value);
      out.push({ type: rule.type, value, start, end: start + value.length, priority });
      if (match.index === regex.lastIndex) regex.lastIndex++;
    }
  });
  return out;
}

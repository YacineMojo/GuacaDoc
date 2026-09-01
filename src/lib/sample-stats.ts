import { DEMO_DOCUMENT, DEMO_DOCUMENT_NAME } from "./demo";
import { DEFAULT_LEVELS, detectEntities } from "./detect/index";
import { loadFromString } from "./extract/index";
import { DEFAULT_BUDGET_RATIO } from "./policy/measure";

/**
 * The numbers the landing page states, computed from the real modules on the
 * real sample rather than typed into the copy.
 *
 * A figure written by hand is a claim that goes stale the first time detection
 * changes. This one cannot: it goes through loadFromString(), the same call the
 * Load sample button makes, so the page and the app count the same bytes and
 * the same sections down to the whitespace.
 */
const doc = loadFromString(DEMO_DOCUMENT_NAME, "md", DEMO_DOCUMENT);
const entities = detectEntities(doc.text);

export const SAMPLE_STATS = {
  bytes: doc.byteLength,
  sections: doc.sections.length,
  entities: entities.length,
  withheld: entities.filter((e) => DEFAULT_LEVELS[e.type] === "blocked").length,
  budgetRatio: DEFAULT_BUDGET_RATIO,
  budgetBytes: Math.floor(doc.byteLength * DEFAULT_BUDGET_RATIO),
} as const;

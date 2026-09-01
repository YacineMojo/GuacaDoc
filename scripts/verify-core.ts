/**
 * Checks on the parts of the policy layer that can be exercised without a
 * browser. Run with `npm run verify`.
 *
 * These are the claims the README makes, expressed as assertions, so that a
 * reviewer can confirm them in one command rather than taking them on trust.
 */
import { detectEntities } from "../src/lib/detect/index";
import { buildRedactor } from "../src/lib/redact";
import { splitIntoSections } from "../src/lib/sections";
import { searchSections } from "../src/lib/search";
import { scrubAndMeasure, truncateToFit } from "../src/lib/policy/measure";
import { answerConfirmation, requestConfirmation } from "../src/lib/policy/confirm";
import { getState } from "../src/lib/store";
import { DEMO_DOCUMENT } from "../src/lib/demo";

let failures = 0;
function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const text = DEMO_DOCUMENT;
const entities = detectEntities(text);
const byType = (t: string) => entities.filter((e) => e.type === t);

console.log(`\ndetection (${entities.length} entities)`);
check("finds the email addresses", byType("email").length >= 3);
check("finds the IBAN", byType("iban").length === 1);
check("finds the payment card", byType("card").length === 1);
check("finds phone numbers", byType("phone").length >= 2);
check("finds monetary amounts", byType("amount").length >= 4);
check("finds dates", byType("date").length >= 6);
check("finds people", byType("person").length >= 4);
check(
  "picks up the full name Marceline Dubreuil",
  entities.some((e) => e.value.includes("Marceline Dubreuil")),
);
check(
  "derives the surname alias so later mentions are covered",
  entities.some((e) => e.value.includes("Dubreuil") && e.aliases.includes("Dubreuil")) ||
    entities.some((e) => e.aliases.some((a) => a === "Nagy" || a === "Brannigan")),
);

console.log("\ntoken stability");
const firstPass = detectEntities(text);
const sameTokens = entities.every((e) => {
  const twin = firstPass.find((f) => f.key === e.key && f.type === e.type);
  return twin?.token === e.token;
});
check("the same value yields the same token across passes", sameTokens);
const dubreuil = entities.find((e) => e.value.includes("Dubreuil"));
check(
  "one token covers every occurrence of a value",
  Boolean(dubreuil && dubreuil.spans.length >= 2),
  dubreuil ? `${dubreuil.spans.length} spans` : "not found",
);

console.log("\nredaction");
const redactor = buildRedactor(entities);
const out = redactor.apply(text);
check("no source email survives", !/@(verrenclay|kaltbrunn)\.example/.test(out));
check("no IBAN survives", !/GB29 NWBK/.test(out));
check("no card number survives", !/4716 8823/.test(out));
check("blocked values are replaced by a marker, not a token", out.includes("[BLOCKED_IBAN]"));
check("pseudonymized people appear as tokens", /\[PERSON_\d\d\]/.test(out));
check("verify() reports the redacted text as clean", redactor.verify(out).length === 0);

const laterMention = "Dubreuil confirmed the figure to Nagy.";
const scrubbedMention = redactor.apply(laterMention);
check(
  "a surname used alone is still substituted",
  !scrubbedMention.includes("Dubreuil"),
  scrubbedMention,
);

console.log("\ndecoding");
const decoded = redactor.decode(out);
check("decode restores a pseudonymized name", decoded.includes("Marceline Dubreuil"));
check("decode does not restore blocked values", !decoded.includes("GB29 NWBK"));

console.log("\nsectioning");
const sections = splitIntoSections(text);
check("splits into addressable sections", sections.length >= 8, `${sections.length} sections`);
check(
  "every declared heading of the sample becomes a section",
  [
    "MASTER SERVICES AGREEMENT",
    "1. Parties",
    "2. Scope of services",
    "3. Term",
    "4. Fees and payment",
    "5. Personal data",
    "6. Liability",
    "7. Confidentiality",
    "8. Governing law",
    "9. Signatures",
  ].every((title) => sections.some((s) => s.title === title)),
);
/*
 * Titles ride the outline free of charge, so a title has to be a title.
 * A real agent run turned three lines of body text into headings: a wrapped
 * cross-reference ("clause 1. Kaltbrunn served notice …"), the "i" of "is"
 * read as a roman numeral ("clause is likely unenforceable …"), and the
 * account number, which shouts like a title because it is all caps. That put
 * 152 B of contract prose into the unbilled channel.
 */
const HEADING_GRAMMAR: Array<[string, boolean]> = [
  ["# MASTER SERVICES AGREEMENT", true],
  ["MASTER SERVICES AGREEMENT", true],
  ["1. Parties", true],
  ["3.2 Payment terms", true],
  ["Article 5 - Liability", true],
  ["ARTICLE 7 — TERMINATION", true],
  ["Clause 12 Termination", true],
  ["SECTION IV", true],
  ["Annexe 2 : Tarifs", true],
  ["Chapitre III", true],
  ["clause 1. Kaltbrunn served notice of a rate revision on 12/09/2027, which the", false],
  ["clause is likely unenforceable against Kaltbrunn given its registered seat.", false],
  ["IBAN GB29 NWBK 6016 1331 9268 19", false],
  ["4716 8823 0091 7745", false],
];
const grammarFailures = HEADING_GRAMMAR.filter(([line, isHeading]) => {
  const title = line.replace(/^#{1,6}\s+/, "");
  const promoted = splitIntoSections(`${line}\n\nbody text here.`).some((s) => s.title === title);
  return promoted !== isHeading;
});
check(
  "body text is never promoted to a heading",
  grammarFailures.length === 0,
  grammarFailures.map(([line]) => JSON.stringify(line.slice(0, 40))).join(", "),
);
check(
  "no section title carries prose from the body",
  sections.every((s) => !/served notice|unenforceable|NWBK/.test(s.title)),
  sections.filter((s) => /served notice|unenforceable|NWBK/.test(s.title)).map((s) => s.id).join(", "),
);

console.log("\nsearch");
const oracleProbe = searchSections(sections, redactor, "Dubreuil", 5);
check("searching a redacted name returns nothing (no oracle)", oracleProbe.length === 0);
const normalProbe = searchSections(sections, redactor, "liability", 5);
check("searching ordinary text still works", normalProbe.length >= 1);
check(
  "snippets carry no source values",
  normalProbe.every((h) => redactor.verify(h.snippet).length === 0),
);

console.log("\nmeasurement and budget");
const measured = scrubAndMeasure({ id: "s01", title: "Fees", text: "Paid to Marceline Dubreuil" }, redactor);
check("structural keys are not billed", measured.billableBytes < 40, `${measured.billableBytes} B`);
check("billed text is the redacted text", measured.billableTexts.join("").includes("[PERSON_"));
const big = { text: "x".repeat(9000) };
const { result, truncated } = truncateToFit(big, redactor, 1024);
check("oversized results are truncated to the cap", truncated && result.billableBytes <= 1024,
  `${result.billableBytes} B`);

console.log("\nleak sweep over every section");
let leaky = 0;
for (const section of sections) {
  const { text: scrubbed, leaks } = redactor.scrub(section.text);
  if (leaks.length > 0 || redactor.verify(scrubbed).length > 0) leaky++;
}
check("no section leaks a non-visible value after scrubbing", leaky === 0, `${leaky} leaky`);

/*
 * Consent, checked because agents batch their calls.
 *
 * The browser extension that drove this app issued two tools in a single turn,
 * twice over. Two write calls arriving together is therefore the ordinary case,
 * and only one modal can be on screen. The second call must not come back as a
 * refusal by the user: nobody was asked.
 */
async function consentChecks() {
  console.log("\nconsent");

  // requestConfirmation() awaits the browser runtime before it opens the
  // modal, so the prompt appears a microtask later than the call. Letting the
  // queue drain is what a real caller does by awaiting the promise.
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  const first = requestConfirmation("add_finding", "first write");
  await settle();
  // The prompt is now on screen and `first` is suspended on it, exactly as it
  // is while a person reads it.
  check("a write call opens a prompt and waits", getState().pendingConfirmation !== null);

  const second = await requestConfirmation("add_finding", "second write");
  check("a concurrent write is reported busy, never declined", second === "busy", String(second));
  check("the busy call left the open prompt alone", getState().pendingConfirmation?.summary === "first write");

  answerConfirmation(true);
  check("the first write still resolves on its own answer", (await first) === "approved");

  answerConfirmation(false);
  check("answering with no prompt open is a no-op", getState().pendingConfirmation === null);

  const declined = requestConfirmation("add_finding", "third write");
  await settle();
  answerConfirmation(false);
  check("a declined write resolves declined", (await declined) === "declined");

  console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`);
  process.exit(failures === 0 ? 0 : 1);
}

void consentChecks();

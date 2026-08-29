import { detectEntities } from "../src/lib/detect/index";
import { DEMO_DOCUMENT } from "../src/lib/demo";
for (const e of detectEntities(DEMO_DOCUMENT)) {
  console.log(
    `${e.type.padEnd(10)} ${e.token.padEnd(14)} ${e.level.padEnd(14)} x${String(e.spans.length).padEnd(3)} ${JSON.stringify(e.value)}${e.aliases.length ? "  aliases=" + JSON.stringify(e.aliases) : ""}`,
  );
}

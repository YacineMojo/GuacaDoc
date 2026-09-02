/**
 * Captures the screenshots the landing page uses.
 *
 * Not part of `build` or `verify`, and playwright is deliberately not a
 * dependency: the app itself must build without a browser. Run it by hand
 * when the interface changes:
 *
 *   npm run build
 *   npx --yes serve out -l 4321 &
 *   npm i -D playwright-core && npx playwright install chromium
 *   node scripts/capture-shots.mjs
 *
 * It writes PNG at 2x. The page loads webp at 1x, which is a quarter of the
 * bytes for no visible difference, so finish with:
 *
 *   python3 -c "
 *   from PIL import Image; import os
 *   for n in ('split-view','agent-view'):
 *       im = Image.open(f'public/shots/{n}.png').convert('RGB')
 *       im.resize((im.width//2, im.height//2), Image.LANCZOS).save(
 *           f'public/shots/{n}.webp', 'WEBP', quality=88, method=6)
 *       os.remove(f'public/shots/{n}.png')"
 *
 * It drives the built copy rather than the dev server, so the shot is of the
 * app as deployed, headers and all. Every value in it comes from the real
 * detector running over the bundled fictional sample.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const ORIGIN = process.env.SHOT_ORIGIN ?? "http://localhost:4321";
const OUT = process.env.SHOT_OUT ?? "public/shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1680, height: 1000 },
  deviceScaleFactor: 2,
});

await page.goto(`${ORIGIN}/app`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /sample contract/i }).click();
await page.waitForSelector("[data-document-surface]", { timeout: 15000 });
await page.waitForTimeout(1200);

/*
 * Both shots are of an element, not the window, and the element chosen starts
 * below the app header on purpose. A headless browser has no WebMCP, so that
 * header reads "webmcp absent · 0 tools" — true, and exactly the wrong thing
 * to put under a claim about WebMCP. The panes below it are the same whether
 * an agent is attached or not.
 */
await page.locator("main > div > div.min-w-0").first().screenshot({
  path: `${OUT}/split-view.png`,
});
console.log(`wrote ${OUT}/split-view.png`);

// The agent view after a real run of the scripted investigation, so the
// record, the strip and the meter all hold genuine numbers.
await page.getByRole("button", { name: "Agent", exact: true }).click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: /sample investigation/i }).click();
await page.waitForTimeout(2500);
await page.locator("main > div").first().screenshot({ path: `${OUT}/agent-view.png` });
console.log(`wrote ${OUT}/agent-view.png`);

await browser.close();

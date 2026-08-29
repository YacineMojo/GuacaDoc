// Copies the pdf.js worker into public/ so it is served from our own origin.
// Loading it from a CDN would be an outbound request, which this app forbids.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const from = resolve(root, "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs");
const to = resolve(root, "public/vendor/pdf.worker.min.mjs");

mkdirSync(dirname(to), { recursive: true });
copyFileSync(from, to);
console.log("copied pdf.js worker -> public/vendor/pdf.worker.min.mjs");

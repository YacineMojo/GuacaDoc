// Serves the static export in `out/`. This is the deployment counterpart of
// `next start`, which cannot be used here: the build is `output: "export"`,
// so there is no server runtime to start. This process reads a directory and
// hands out files, exactly as the nginx config it replaces did.
//
// It exists rather than a generic static server because the headers below are
// load-bearing, not decoration, and a host that drops them silently degrades
// the app into one that looks identical and proves nothing.

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const ROOT = resolve(import.meta.dirname, "out");
const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

// The same policy the page carries in a meta tag, delivered as a real header
// so that frame-ancestors takes effect. connect-src 'none' is the load-bearing
// directive: the browser refuses any outbound connection from this origin,
// which is what makes "the document never leaves" checkable rather than merely
// stated.
const CSP =
  "default-src 'self'; connect-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
  "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; " +
  "worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'; " +
  "frame-ancestors 'none'";

const SECURITY_HEADERS = {
  "Content-Security-Policy": CSP,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Opener-Policy": "same-origin",
  // WebMCP is only exposed to origin-isolated documents. Without this header
  // the agent cluster stays site-keyed, document.modelContext.registerTool()
  // rejects with SecurityError, and the page ends up announcing tools that no
  // agent can reach: its calls never enter the policy layer and the record
  // stays empty while an agent reports having used the tools.
  "Origin-Agent-Cluster": "?1",
};

const TYPES = new Map(
  Object.entries({
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".wasm": "application/wasm",
    ".map": "application/json; charset=utf-8",
    ".pdf": "application/pdf",
  }),
);

async function fileAt(path) {
  try {
    const info = await stat(path);
    return info.isFile() ? info : null;
  } catch {
    return null;
  }
}

// nginx `try_files $uri $uri.html $uri/ /index.html`, kept in the same order.
async function locate(pathname) {
  const relative = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const target = resolve(join(ROOT, relative));
  if (target !== ROOT && !target.startsWith(ROOT + sep)) return null;

  const candidates = pathname.endsWith("/")
    ? [join(target, "index.html")]
    : [target, `${target}.html`, join(target, "index.html")];

  for (const candidate of candidates) {
    const info = await fileAt(candidate);
    if (info) return { path: candidate, info };
  }
  return null;
}

function send(res, status, found, method) {
  const headers = {
    ...SECURITY_HEADERS,
    "Content-Type": TYPES.get(extname(found.path).toLowerCase()) ?? "application/octet-stream",
    "Content-Length": found.info.size,
    "Cache-Control": found.path.startsWith(join(ROOT, "_next", "static"))
      ? "public, max-age=31536000, immutable"
      : "public, max-age=0, must-revalidate",
  };
  res.writeHead(status, headers);
  if (method === "HEAD") return res.end();
  createReadStream(found.path).pipe(res);
}

const server = createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { ...SECURITY_HEADERS, Allow: "GET, HEAD" });
    return res.end();
  }

  const { pathname } = new URL(req.url ?? "/", "http://localhost");
  const found = await locate(pathname);
  if (found) return send(res, 200, found, req.method);

  // error_page 404 /404.html, with the export's shell as the last resort.
  const fallback = (await locate("/404.html")) ?? (await locate("/index.html"));
  if (fallback) return send(res, 404, fallback, req.method);

  res.writeHead(404, { ...SECURITY_HEADERS, "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found\n");
});

server.listen(PORT, HOST, () => {
  console.log(`Serving ${ROOT} on http://${HOST}:${PORT}`);
});

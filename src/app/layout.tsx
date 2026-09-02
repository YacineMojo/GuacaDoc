import type { Metadata, Viewport } from "next";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/newsreader";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/branding";

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} — ${PRODUCT_TAGLINE}`,
  description:
    "A document stays in your browser tab. An AI agent reads it through WebMCP tools whose every answer passes a policy layer: stable pseudonyms, values withheld outright, and a visible record of what left.",
};

export const viewport: Viewport = {
  themeColor: "#f4f7ef",
  width: "device-width",
  initialScale: 1,
};

/**
 * The policy that matters most is the one the browser enforces.
 *
 * connect-src 'none' means this page cannot open a network connection at all:
 * no fetch, no XHR, no websocket, no beacon. Anyone can confirm it from the
 * Network tab in a few seconds, which is a stronger claim than any promise in
 * a README. It is applied to production builds only, because the dev server
 * needs its websocket to reload the page.
 *
 * It is also why navigation between the two pages uses a plain anchor rather
 * than next/link: client-side routing would fetch an RSC payload, and this
 * origin is not allowed to fetch anything.
 */
const CSP = [
  "default-src 'self'",
  "connect-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {process.env.NODE_ENV === "production" && (
          <meta httpEquiv="Content-Security-Policy" content={CSP} />
        )}
        <meta name="referrer" content="no-referrer" />
      </head>
      <body>{children}</body>
    </html>
  );
}

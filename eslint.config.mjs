import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored third-party build artefact, copied in by scripts/copy-pdf-worker.mjs.
    "public/vendor/**",
  ]),
  {
    rules: {
      /*
       * Navigation between the two pages uses plain anchors on purpose.
       * next/link does client-side routing, which fetches an RSC payload, and
       * production builds ship connect-src 'none': this origin is not allowed
       * to fetch anything. A full page load costs nothing on a static export
       * and keeps the central claim of the product true.
       */
      "@next/next/no-html-link-for-pages": "off",
    },
  },
]);

export default eslintConfig;

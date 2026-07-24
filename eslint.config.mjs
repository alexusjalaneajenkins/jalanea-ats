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
    // Package-matched vendored PDF.js worker; verified byte-for-byte in tests.
    "public/pdf.worker.min.mjs",
    "**/* 2.ts",
    "**/* 2.tsx",
    "**/* 2.js",
    "**/* 2.jsx",
    "**/* 2.mjs",
    "**/* 2.cjs",
  ]),
]);

export default eslintConfig;

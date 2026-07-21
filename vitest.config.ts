import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit tests cover the security-critical PURE logic (sanitize, tokens, CSP,
// slug, anchor/analytics helpers) — no Cloudflare bindings required, so a plain
// node environment with Web Crypto (Node 20+) is enough.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});

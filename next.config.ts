import type { NextConfig } from "next";

/**
 * Permanent moves.
 *
 * Declared here rather than in middleware. A middleware redirect costs a
 * runtime hop on a route that is otherwise fully static, and `redirects()` is
 * what the framework provides for exactly this case — it is applied at the edge
 * before routing, with no function invocation.
 *
 * `permanent: true` emits a 308, which preserves the method and tells caches
 * and search engines the move is not provisional. `redirects.test.ts` asserts
 * each entry still resolves: the entire purpose of a redirect is that existing
 * links survive, and an untested one breaks quietly during an unrelated
 * refactor. The person who notices is a reader who has already left.
 */
export const PERMANENT_REDIRECTS: readonly {
  source: string;
  destination: string;
  reason: string;
}[] = [
  {
    source: "/knowledge/citations",
    destination: "/citations",
    reason:
      "Citations are app-wide infrastructure — exercises, the glossary and later autoregulation all cite them, so the bibliography no longer belongs under one section. See docs/adr/0005-citations-are-shared-infrastructure.md.",
  },
];

const nextConfig: NextConfig = {
  async redirects() {
    return PERMANENT_REDIRECTS.map(({ source, destination }) => ({
      source,
      destination,
      permanent: true,
    }));
  },
};

export default nextConfig;

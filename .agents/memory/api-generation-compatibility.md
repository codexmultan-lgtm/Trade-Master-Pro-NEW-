---
name: API generation compatibility
description: Why API generation pins runtime compatibility instead of trusting auto-detection
---

Keep API generation compatible with the application's installed Zod and TanStack Query versions; do not upgrade those runtimes merely to accommodate generator defaults.

**Why:** In this pnpm catalog workspace, Orval failed to detect TanStack Query and assumed v4, and separately generated Zod v4 calls for a Zod v3 application. Explicit generation targets resolved both without a runtime migration. Newer generator tooling also required Node.js 24 instead of the import's Node.js 20.

**How to apply:** When updating the generator, verify both emitted validation schemas and client hooks against the installed runtimes, and preserve the manually curated validation-schema exports. Older guidance that customized query options always require an explicit query key is obsolete with the current Query v5 generator configuration.

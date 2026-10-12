---
name: Trade UI responsiveness scope
description: User constraint for responsive revisions to the user-side trade module
---

For mobile-responsive revisions to the user-side trade module, change frontend presentation only; preserve backend logic and existing trading functionality.

**Why:** The user explicitly requested: “DONT change any backend logic or functionality. Just fix frontend.”

**How to apply:** Keep responsive changes scoped to the user trading screens. Do not change trade submission, durations, payouts, permissions, or realtime behavior as part of UI responsiveness work.

Keep merge setup frontend-only. Do not upgrade backend dependencies or run database pushes to resolve setup failures without separate approval.

**Why:** When offered a backend dependency update to resolve a blocked package download, the user explicitly chose “Keep setup frontend-only.”

**How to apply:** Install only the frontend/test packages and their workspace dependencies for this work. Treat backend dependency repair and database operations as outside the approved scope.

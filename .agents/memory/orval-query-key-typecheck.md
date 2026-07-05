---
name: Orval-generated query hooks require explicit queryKey with custom options
description: Passing `enabled`/`refetchInterval` etc. to an orval-generated useQuery hook without `queryKey` fails typecheck in this project's tsconfig strictness
---

In this monorepo's orval-generated React Query hooks (`lib/api-client-react/src/generated/api.ts`), passing `{ query: { enabled: ... } }` (or other react-query options) without also passing `queryKey` fails typecheck with `Property 'queryKey' is missing`.

**Why:** The generated `UseQueryOptions` type in this project requires `queryKey` explicitly once you override any query option — TS can't infer it's optional despite orval's own internal default-fallback logic (`queryOptions?.queryKey ?? getXQueryKey()`).

**How to apply:** When adding custom react-query options (e.g. `enabled`, `refetchInterval`, `refetchOnWindowFocus`) to a generated hook like `useGetMe`, also import and pass the matching `getXQueryKey()` helper, e.g. `queryKey: getGetMeQueryKey()`. Pre-existing call sites without this (e.g. `useGetAdminUser(id, { query: { enabled: !!id } })`) have the same latent typecheck error — it's not new, don't try to "fix" it unless asked.

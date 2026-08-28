# afterclass.io MCP server (`src/mcp`)

The afterclass.io Model Context Protocol (MCP) server, built on
[mcp-use](https://mcp-use.com). It exposes the shared tool catalog
(`src/server/mcp/tools`) - the same 42 tools the in-app assistant widget uses -
as a remote, OAuth-protected MCP server with two MCP Apps widgets.

- **Server entry:** `src/mcp/index.ts` (mcp-use `MCPServer` + `oauthSupabaseProvider`)
- **Tool wiring:** `src/mcp/register.ts` (per-call auth via `src/mcp/user.ts`)
- **Widgets:** `src/mcp/resources/{bid-recommendation,course-search}/widget.tsx`
- **Local dev:** `bun run mcp:dev` -> Inspector at `http://localhost:3001/inspector`

---

## Architecture

```
+-----------------------------+      +--------------------------------------------+
|  Next.js app (Vercel)       |      |  mcp-use server (this repo: src/mcp/)      |
|                             |      |                                            |
|  - website                  |      |  - MCP transport (streamable HTTP)         |
|  - Supabase identity        |      |  - 42 tools from the shared catalog        |
|  - consent screen           |      |    (src/server/mcp/tools - single source   |
|    /oauth/consent           |      |     of truth, shared with the assistant    |
|                             |      |     widget)                                |
+--------------+--------------+      |  - MCP Apps widgets                        |
               |                     |    (resources/bid-recommendation,          |
               | redirects here      |     resources/course-search)               |
               v                     +---------------+----------------------------+
+-------------------------------------+              | token verification
|  Supabase Auth (hosted OAuth 2.1    |<-------------+  (JWT), DCR metadata
|  authorization server)              |                 proxy
|  - issues MCP tokens                |
|  - Dynamic Client Registration      |
+-------------------------------------+
```

Three moving parts:

1. **Next.js app (Vercel)** - the website, Supabase-backed sign-in, and the
   hosted consent screen at `/oauth/consent` (`src/app/oauth/consent/page.tsx`
   + `src/app/api/oauth/consent/route.ts`). The user approves or denies an
   authorization request from this screen.
2. **mcp-use server (`src/mcp/`)** - the MCP transport. It hosts the 42 tools
   from the shared catalog and the two widgets, and it runs the
   `oauthSupabaseProvider()` so MCP clients authenticate against Supabase.
   It is deployed independently of the Next.js app (see
   [Deploy procedure](#deploy-procedure)).
3. **Supabase Auth** - the hosted OAuth 2.1 authorization server. It issues the
   MCP access tokens, handles Dynamic Client Registration (DCR) for MCP
   clients, and redirects the user to the app&apos;s consent screen.

### Single source of truth for tools

All 42 tools are defined in `src/server/mcp/tools` (e.g. `search-courses`,
`my-timetables`, `recommend-bid-amount`). The same catalog powers:

- the **in-app assistant widget** (via the tRPC caller), and
- the **MCP server** (`src/mcp/register.ts` iterates `allTools` and registers
  each as an mcp-use tool, resolving the caller from the OAuth identity per
  call).

A tool only needs to be changed in one place.

---

## Tool catalog (42 tools)

The shared catalog exposes 42 tools over MCP. The roadmap-detail, planning,
timetable-detail, and feasibility additions are:

| Tool | Purpose |
| --- | --- |
| `get-my-roadmap` | Get one of the user's own roadmaps with ALL its course entries (year/term, course code/name/credit units). Use this to see your own progression before planning. |
| `get-public-roadmap` | Get a public roadmap with ALL its course entries plus the owner and vote count. Use this to study a senior's full progression. |
| `plan-semester` | Compound planning tool: given the user's progression, returns the target academic term, the user's position, and ranked course candidates that seniors in the same faculty took at that point. |
| `get-my-timetable-detail` | Get the full weekly arrangement of one of the user's own timetables: class times, venues, and professors, flattened to one row per weekly meeting. Pass a `timetableId` from `my-timetables`, or omit it (with an `acadTermId`) to resolve the active timetable. Use when a student asks "show me my timetable" or "what classes do I have?". |
| `check-roadmap-feasibility` | Check a roadmap for planning conflicts and return `{ issues, isFeasible }`: `PREREQ_MISSING` (a course's prerequisite isn't planned in an earlier term), `TERM_DUPLICATE` (the same course twice in one year/term), and `EXAM_CLASH` (two courses' exams overlap - checked when `termId` is passed; **skipped if no timetable exists for the requested term**, so the plan isn't fully verified on the clash dimension in that case). Use before committing to a plan or when a student asks "is my plan feasible?". |

`get-course` also includes each course's SIS prerequisite info when present:
`enrolmentRequirements` (the raw prereq string, e.g. "Pre-Requisite: EITHER
COR-IS1702 OR ...") and `courseArea` (degree-area tags).

Account-control tools (read-only):

| Tool | Purpose |
| --- | --- |
| `get-me` | Get the signed-in student's own account profile: id, display name, email, faculty (id + name), and account creation date. Use to confirm identity/faculty before personalizing advice. |
| `get-usage` | Get the signed-in student's assistant quota state: messages used in the current period, the period limit, the critical floor (messages remaining at/below which usage is critical, 20% of the period limit), messages remaining, and whether usage is critical. Use to warn a student before they hit their monthly assistant limit. |

Roadmap-settings and bid-status write tools (Task 5):

| Tool | Purpose |
| --- | --- |
| `set-matric-term` | Set the matriculation term (the user's Y1T1 acad term id, from `list-acad-terms`) on a roadmap. **Required for accurate `plan-semester` seniority** and for `sync-roadmap-progress`. Pass `matricTermId: null` to clear. |
| `set-active-roadmap` | Mark a roadmap as the user's single active roadmap (clears `isActive` on all the user's other roadmaps). Set this before `sync-roadmap-progress` / `plan-semester` so they target the intended roadmap. |
| `sync-roadmap-progress` | Add the user's course history into a roadmap: for every acad term from the declared matriculation term up to the current term, courses from the user's active timetable for that term are added to the matching roadmap year/term. Add-only - never deletes or duplicates courses. Returns `{ synced, courseIds }`. |
| `copy-public-roadmap` | Copy a public roadmap (from `browse-public-roadmaps` / `get-public-roadmap`) into the user's own account as `<name> (copy)`. Returns `{ newRoadmapId, name }`. |
| `set-bid-status` | Set a bid's outcome status: `PLANNED` / `SECURED` / `DROPPED` / `CANCELLED` / `PARTICIPATED`. |

Two companion surfaces are registered alongside the tools:

| Surface | Kind | Purpose |
| --- | --- | --- |
| `plan-semester` | Prompt | User-selectable template that steers the model toward the `plan-semester` workflow instead of a long tool chain. |
| `catalog://acad-terms` | Resource | The academic terms the course catalog is offered in (`id` = `acadTermId` used by `search-courses` and `plan-semester`). |

### Planning queries

For multi-step planning questions - "plan my semester", "what should I take
next term", "plan inspired by seniors" - call `plan-semester` in one call
instead of chaining many lookups: it resolves the target term, the user's
position, and ranked candidates in a single call. Use the individual tools for
single lookups: `get-my-roadmap` / `get-public-roadmap` for full roadmap
entries, `search-courses` / `get-course` / `get-classes` for course detail, and
`list-acad-terms` for the academic-term catalog.

---

## Public MCP URL

> The deployed URL is read from `NEXT_PUBLIC_MCP_PUBLIC_URL` at runtime
> (`src/modules/settings/agents/connect-links.ts` exports `MCP_PUBLIC_URL`
> from it, falling back to the placeholder below). Set it on the host at
> deploy time (Task 8 Step 1) - do not hardcode a slug in source.

The primary target is a Manufact Cloud deployment:

```
https://<slug>.run.mcp-use.com/mcp
```

Clients (Claude, ChatGPT, Cursor, VS Code, or the mcp-use Inspector) connect to
this URL. On first connect the client performs discovery:

1. `GET /.well-known/oauth-protected-resource` (RFC 9728) - served locally by
   the mcp-use server, points at the resource metadata.
2. `GET /.well-known/oauth-authorization-server` - proxied by the mcp-use
   server to Supabase&apos;s OAuth 2.1 authorization-server metadata.
3. The client registers itself with Supabase (DCR, using the publishable key),
   redirects the user to the consent screen, and exchanges the resulting code
   for a token at Supabase&apos;s token endpoint.
4. The token is verified per call by `oauthSupabaseProvider()` (Supabase JWKS);
   each tool resolves the caller from `ctx.auth.user` (see `src/mcp/user.ts`)
   and fails closed when unauthenticated.

The mcp-use Inspector (`bun run mcp:dev` -> `http://localhost:3001/inspector`)
is the easiest way to exercise this locally against a real Supabase project.

---

## Environment variables

`oauthSupabaseProvider()` reads these server env vars (set them in the Manufact
dashboard / host - see [Deploy procedure](#deploy-procedure)):

| Variable | Purpose |
| --- | --- |
| `MCP_USE_OAUTH_SUPABASE_PROJECT_ID` | **Required.** Supabase project ref. `oauthSupabaseProvider()` derives the auth URL `https://<ref>.supabase.co` from it. |
| `MCP_USE_OAUTH_SUPABASE_URL` | *Optional.* Full Supabase auth URL - only for **local / self-hosted** Supabase (e.g. `http://localhost:54321`). Overrides the URL derived from `MCP_USE_OAUTH_SUPABASE_PROJECT_ID`. |
| `MCP_USE_OAUTH_SUPABASE_JWT_SECRET` | *Optional.* Only for **legacy HS256** Supabase JWT projects. Omit for the default RS256 (JWKS-verified) projects. |
| `DATABASE_URL` | The same Postgres the Next.js app uses - tools read via the tRPC caller (Prisma). |
| `SKIP_ENV_VALIDATION` | **Do not set.** With the flag set, `@t3-oss/env-nextjs` skips the env schema transforms, so `NEXT_PUBLIC_SUPPORTED_SCH_DOMAINS` stays a comma-string and `src/common/tools/zod/schemas.ts` crashes on `.join()` at boot. Provide the full app env set instead. |
| Full Next.js app env | `env` validation runs on the mcp process (it imports `@/env` via tRPC), so the host needs the same server vars as the app: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `LLM_API_KEY`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, plus the `NEXT_PUBLIC_*` vars below. The repo `.env` already has these. |
| `NEXT_PUBLIC_*` vars | Any client env var a tool path reads (e.g. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPPORTED_SCH_DOMAINS`). Add more as runtime errors surface during E2E. |
| `NEXT_PUBLIC_MCP_PUBLIC_URL` | *Optional.* Public MCP URL used by the Settings -> Agents connect page deep links (`src/modules/settings/agents/connect-links.ts` -> `MCP_PUBLIC_URL`). Falls back to the placeholder until deployed. |

> **`MCP_USE_OAUTH_SUPABASE_PUBLISHABLE_KEY` is NOT a server env var.** The
> server never reads it - `oauthSupabaseProvider()` only reads
> `MCP_USE_OAUTH_SUPABASE_PROJECT_ID`, `MCP_USE_OAUTH_SUPABASE_URL` and
> `MCP_USE_OAUTH_SUPABASE_JWT_SECRET`. The publishable key (`sb_publishable_...`)
> is a **client-facing** Dynamic Client Registration (DCR) credential: MCP
> clients obtain it from Supabase&apos;s OAuth authorization-server metadata,
> which the mcp-use server proxies at `/.well-known/oauth-authorization-server`.
> Setting it in the deployed server&apos;s env would be a no-op.

`src/mcp/index.ts` does not validate env vars itself - validation happens when
the tool stack imports `@/env`, so a missing variable surfaces at boot or on
the first tool call. Start with the table above and add vars as needed.

---

## Supabase dashboard setup (human)

One-time configuration in the Supabase dashboard for the project used by
`MCP_USE_OAUTH_SUPABASE_PROJECT_ID`:

1. **Authentication -> OAuth Server** (the Supabase OAuth 2.1 server, which
   powers MCP auth).
2. Enable the **OAuth 2.1 server**.
3. Enable **Allow Dynamic OAuth Apps** (needed so MCP clients can register
   themselves via DCR).
4. Set the **Authorization Path** to `/oauth/consent` - Supabase redirects the
   user here with `?authorization_id=...`; the app&apos;s consent screen
   (`src/app/oauth/consent/page.tsx`) approves/denies.
5. Under **Authentication -> URL Configuration**, set **Site URL** to
   `https://afterclass.io` (prod) or `http://localhost:3000` (local dev) so the
   authorization path resolves against the right origin.
6. Copy the **project ref** into the deployed server&apos;s env vars as
   `MCP_USE_OAUTH_SUPABASE_PROJECT_ID` (see table above). The **publishable
   key** is client-facing - MCP clients obtain it from Supabase&apos;s OAuth
   metadata (which the server proxies), so no server env var is needed for it.

The app&apos;s consent route requires a signed-in session whose Auth.js JWT
carries a Supabase access token (kept server-only in the encrypted session
cookie; read via `getSupabaseAccessToken()` in
`src/server/auth/supabase-access-token.ts`). Without it the route returns 401.

---

## Consent flow

The end-to-end OAuth 2.1 authorization-code flow with Supabase-hosted consent:

1. The **MCP client** discovers the server&apos;s OAuth metadata
   (`/.well-known/oauth-protected-resource` + the Supabase
   authorization-server metadata proxied by the server).
2. The client **registers itself** (DCR) with Supabase and redirects the user
   to Supabase&apos;s **authorize** endpoint.
3. Supabase redirects the user to the app&apos;s **consent screen**
   (`https://afterclass.io/oauth/consent?authorization_id=...`).
4. The consent screen loads the authorization details via the consent API
   route (already-consented clients are redirected straight back).
5. The user **approves or denies**; the screen calls
   `POST /api/oauth/consent` with `{ authorization_id, decision }`.
6. On approval, Supabase redirects back to the client with an **authorization
   code**.
7. The client exchanges the code at Supabase&apos;s **token** endpoint and uses
   the resulting MCP access token for `tools/list` / `tools/call`.

Under the hood: `src/server/supabase-consent.ts` (per-call Supabase client
authenticated with the user&apos;s access token) -> `approveConsent` /
`denyConsent` / `getConsentDetails` -> the consent route/page.

---

## Security

Write-path hardening (Task 6):

- **`my-bids` scrubs `notes`.** The tool drops each bid's free-text `notes`
  field (user PII / private bidding strategy) from the JSON returned to the
  model. Bid amount, status, class, window, and result metadata are preserved.
- **`get-classes` caps at 20 rows.** The tool clamps any `limit > 20` down to
  20 (the spec cap) before querying, while still accepting larger `limit`
  values for backward compatibility.
- **Write tools are rate-limited (DB-backed).** Every non-read-only tool
  registered over MCP shares one DB-backed, per-user write budget of
  `mcpRateLimitPerMinute` calls/minute (from `getChatConfig()`, default 60)
  via `checkAndIncrement` keyed `mcp-write:<userId>`. When the budget is
  exhausted, the tool returns a friendly error instead of running. Read tools are
  unaffected.

Surface trim (Task 7):

- **`get-safety-factors` removed.** Safety multipliers are internal tuning
  knobs only meaningful inside `recommend-bid-amount` (which reads them
  directly); the standalone tool exposed them with no guardrail. The
  `safetyFactors` router stays for the website UI.
- **`publish-roadmap` / `unpublish-roadmap` removed.**
  `set-roadmap-visibility` is now the single visibility tool
  (PRIVATE/UNLISTED/PUBLIC); PUBLIC publishes (verified account required) and
  PRIVATE unpublishes from the public gallery - the underlying
  `sharing.setVisibility` already implements both paths.
- **`set-bid-budget` capped at `MAX_BUDGET` (10000).** Balances above
  `MAX_BUDGET` are rejected with a clear error instead of letting an agent
  write an arbitrary budget.

## Known limitations

1. **Supabase-identity only.** Supabase-issued MCP tokens identify users with a
   Supabase identity (`src/mcp/user.ts` resolves the caller from
   `ctx.auth.user`). A Google-only user (no linked Supabase identity) cannot
   connect an agent until a Supabase identity is linked to their account.
2. **~1h access-token expiry in consent.** The Supabase access token carried in
   the NextAuth session is captured at sign-in and expires after roughly one
   hour. A stale consent attempt surfaces a Supabase auth error on the consent
   route (400) - the user should re-login. A refresh-token flow is tracked for
   later (documented in `src/server/supabase-consent.ts`).
3. **Raw widget schemas in the CLI manifest (zod v3).** The mcp-use CLI bundles
   zod v4, while the widget prop schemas here are zod v3 - the
   v3->input-definition conversion falls back to `raw schema` in the manifest.
   Cosmetic only: widget rendering is unaffected. Revisit on a zod v4 upgrade.

---

## Deploy procedure

> **Prerequisite (prod):** enable the `pg_trgm` extension in Supabase
> Dashboard -> Database -> Extensions. The fuzzy/typo-tolerant course search
> (`search-courses`) depends on it (migration
> `20260804153348_add_pg_trgm_and_course_search_indexes`).

### Primary: Manufact Cloud

1. Create an account at [manufact.com](https://manufact.com). `@mcp-use/cli` is
   already a devDependency.
2. From the repo root:
   ```bash
   bunx mcp-use login
   bunx mcp-use deploy --root-dir .
   ```
   The CLI detects the mcp-use project (`src/mcp`). If the repo is not
   connected to GitHub, add `--no-github` (uploads source without linking).
3. Set the env vars from the [table above](#environment-variables) in the
   Manufact dashboard for the deployed server.
4. Record the public MCP URL (e.g. `https://<slug>.run.mcp-use.com/mcp`) and
   set it as `NEXT_PUBLIC_MCP_PUBLIC_URL` in the host's env (read by
   `connect-links.ts` -> `MCP_PUBLIC_URL`; see
   [Public MCP URL](#public-mcp-url)).

### Fallback: any Node host

If Manufact is not acceptable, run the server on any Node host (Railway /
Fly.io / Cloud Run) with the same env vars and port `3000` exposed:

```bash
bunx mcp-use build --mcp-dir src/mcp
bunx mcp-use start --mcp-dir src/mcp
```

**Chosen host:** record the host here once selected (Task 8 Step 1), and set
`NEXT_PUBLIC_MCP_PUBLIC_URL` to its deployed URL (see
[Public MCP URL](#public-mcp-url)).

---

## E2E verification checklist

To be ticked by a human **after** deploy (Task 8 Step 1). Local equivalent:
`bun run mcp:dev` and connect the mcp-use Inspector at
`http://localhost:3001/inspector` with a real Supabase-logged-in user.

- [ ] Claude / ChatGPT (or the mcp-use Inspector) connects to
      `https://<slug>.run.mcp-use.com/mcp`
- [ ] OAuth discovery succeeds against Supabase (client auto-configures)
- [ ] User is redirected to `https://afterclass.io/oauth/consent?authorization_id=...`
- [ ] User signs in (school email), sees client name + scopes, clicks **Approve**
- [ ] User is redirected back with a code; the client exchanges it for a token
- [ ] `tools/list` returns the **42 tools**
- [ ] `tools/call` on `my-timetables` returns the user&apos;s own data (scoped correctly)
- [ ] `tools/call` on `recommend-bid-amount` renders the bid-recommendation widget
- [ ] `tools/call` on `search-courses` renders the course-search widget
- [ ] An unauthenticated call returns an error (fails closed)

---

## Local commands

| Command | What it does |
| --- | --- |
| `bun run mcp:dev` | Dev server + Inspector on `:3001` (`mcp-use dev --mcp-dir src/mcp --port 3001`) |
| `bun run mcp:build` | Build the server + widgets (`mcp-use build --mcp-dir src/mcp`) |
| `bun run mcp:start` | Start the production server (`mcp-use start --mcp-dir src/mcp`) |

Versions: `mcp-use@^1` (server) with `@mcp-use/cli@^3` (the v1-compatible CLI).

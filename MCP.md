# afterclass.io MCP server

The afterclass.io Model Context Protocol (MCP) server, built on [mcp-use](https://mcp-use.com) (v2). It exposes the shared tool catalog (`src/server/mcp/tools` — the same 49 tools the in-app assistant uses) as a remote, OAuth-protected MCP server with 7 MCP Apps Views.

- **Server entry:** `src/mcp/index.ts` (re-exports the shared `MCPServer` instance from `src/mcp/server.ts`)
- **Server + OAuth wiring:** `src/mcp/server.ts` + `mcp-use/oauth/supabase`
- **Tool wiring:** `src/mcp/view-tools/*` (7 view-bound tools) + `src/mcp/register.ts` (42 viewless tools) + `src/mcp/user.ts`
- **Views:** `views/<name>/view.tsx`
- **Local dev:** `bun run mcp:dev` → Inspector at `http://localhost:3001/mcp/inspector`

> **Local dev needs no Supabase.** `mcp:dev` runs the server with **no OAuth middleware** (see [Local dev mode](#local-dev-mode-no-supabase-required)). The Inspector connects instantly and tool calls resolve as the seeded dev user. The Supabase OAuth 2.1 flow described below only kicks in outside development (deployed servers, `mcp:start`).

## Architecture

```
+-----------------------------+      +--------------------------------------------+
|  Next.js app (Vercel)       |      |  mcp-use server (this repo: src/mcp/)      |
|                             |      |                                            |
|  - website                  |      |  - MCP transport (streamable HTTP)         |
|  - Supabase identity        |      |  - 49 tools from the shared catalog        |
|  - consent screen           |      |    (src/server/mcp/tools - single source   |
|    /oauth/consent           |      |     of truth, shared with the in-app       |
|                             |      |     assistant)                             |
+--------------+--------------+      |  - MCP Apps Views (7)                      |
               |                     |    (views/bid-recommendation,              |
               | redirects here      |     views/course-search,                   |
               v                     |     views/calendar-links,                  |
+-------------------------------------+     views/bid-plan,                      |
|  Supabase Auth (hosted OAuth 2.1    |     views/roadmap-view,                   |
|  authorization server)              |     views/review-cards,                   |
|  - issues MCP tokens                |     views/bid-explorer)                   |
|  - Dynamic Client Registration      |               +----------------------------+
+-------------------------------------+              | token verification
                                                     |  (JWT), DCR metadata
                                                     |  proxy
```

Three moving parts:

1. **Next.js app (Vercel)** — the website, Supabase-backed sign-in, and the hosted consent screen at `/oauth/consent` (`src/app/oauth/consent/page.tsx` + `src/app/api/oauth/consent/route.ts`). The user approves or denies an authorization request from this screen.
2. **mcp-use server (`src/mcp/`)** — the MCP transport (streamable HTTP); hosts the 49 tools from the shared catalog + 7 Views, and runs `oauthSupabaseProvider()`. Deployed independently of the Next.js app (see [Deploy](#deploy)).
3. **Supabase Auth** — the hosted OAuth 2.1 authorization server: issues MCP access tokens, handles Dynamic Client Registration (DCR) for MCP clients, and redirects the user to the app's consent screen.

### Single source of truth for tools

All 49 tools live in `src/server/mcp/tools` (e.g. `search-courses`, `my-timetables`, `recommend-bid-amount`). The same catalog powers the **in-app assistant** (via the tRPC caller) and the **MCP server** (`src/mcp/register.ts` + `src/mcp/view-tools/*` resolve the caller from the OAuth identity per call). A tool only needs to be changed in one place.

## Authorization / consent flow

> Only applies **outside development**. `mcp:dev` sets `NODE_ENV=development` and `src/mcp/server.ts` omits `oauth`, so no bearer middleware is mounted and the flow below is skipped entirely (see [Local dev mode](#local-dev-mode-no-supabase-required)).

The end-to-end OAuth 2.1 authorization-code flow with Supabase-hosted consent:

1. The **MCP client** discovers the server's OAuth metadata (`/.well-known/oauth-protected-resource` + the Supabase authorization-server metadata proxied by the server).
2. The client **registers itself** (DCR) with Supabase and redirects the user to Supabase's **authorize** endpoint.
3. Supabase redirects the user to the app's **consent screen** (`/oauth/consent?authorization_id=...`).
4. The consent screen loads the authorization details via the consent API route (already-consented clients are redirected straight back).
5. The user **approves or denies**; the screen calls `POST /api/oauth/consent` with `{ authorization_id, decision }`.
6. On approval, Supabase redirects back to the client with an **authorization code**.
7. The client exchanges the code at Supabase's **token** endpoint and uses the resulting MCP access token for `tools/list` / `tools/call`.

Under the hood: `src/server/supabase-consent.ts` (a per-call Supabase client authenticated with the user's access token) → `approveConsent` / `denyConsent` / `getConsentDetails` → the consent route/page. On every call the token is verified by `oauthSupabaseProvider()` (Supabase JWKS); each tool resolves the caller from `ctx.auth.user` via `src/mcp/user.ts` → `createCallerForUser` (a user-scoped tRPC caller) and **fails closed** when unauthenticated.

## Tool catalog (49 tools)

The shared catalog exposes 49 tools over MCP (27 readOnly + 22 write), defined in `src/server/mcp/tools` — read tools under `tools/read/`, write tools under `tools/write/`, aggregated in `tools/index.ts`. readOnly tools are annotated `readOnlyHint` and skip the write budget.

Tool families:

- **Courses / classes / professors + ranked search** — course and class detail with ranked, senior-informed candidates (`search-courses`, `get-course`, `get-classes`, `search-professors`, `list-acad-terms`).
- **Catalog** — reviews, bid results / predictions / windows, and academic terms (`get-course-reviews`, `get-professor-reviews`, `get-review-summary`, `get-bid-results`, `get-bid-windows`, `get-contribute-info`).
- **Own data** — timetables, roadmaps, bids, budget (`my-timetables`, `my-roadmaps`, `my-bids`, `my-bid-plan`, `my-bid-budget`).
- **Planning / estimation** — `plan-semester`, `check-roadmap-feasibility`, `get-my-timetable-detail`, `bid-estimate` (per-section median/min + suggested amount + vacancy for the open window).
- **Write tools** — bids, timetables, roadmaps, roadmap settings, bid status, calendar links, recommend (`upsert-bid`, `set-bid-budget`, `set-bid-status`, `save-bids`, `set-matric-term`, `set-active-roadmap`, `sync-roadmap-progress`, `copy-public-roadmap`, `upsert-roadmap-entry`, `set-roadmap-visibility`, `get-timetable-calendar-link`, `recommend-bid-amount`).

> **Mutation echo:** every bid/budget write (`set-bid-budget`, `upsert-bid`, `remove-bid`, `set-bid-status`, `save-bids`) returns the full updated `{ updated, plan }` in its text output; roadmap writes (`copy-public-roadmap`, `create-roadmap`, `save-roadmap-entries`, `upsert-roadmap-entry`) return the updated roadmap view. Chat prompts tell the model to summarize the returned plan/roadmap instead of re-fetching.

Two companion surfaces are registered alongside the tools:

| Surface                | Kind     | Purpose                                                             |
| ---------------------- | -------- | ------------------------------------------------------------------- |
| `plan-semester`        | Prompt   | User-selectable template steering the model toward the `plan-semester` workflow instead of a long tool chain. |
| `catalog://acad-terms` | Resource | The academic terms the course catalog is offered in (`id` = `acadTermId` used by `search-courses` and `plan-semester`). |

### MCP Apps Views (7)

mcp-use v2 renders **one View per bound tool**: each of the 7 View directories (`views/<name>/view.tsx`) is bound to exactly one canonical tool, declared via the tool's `view: { name: ... }` config in `src/mcp/view-tools/*`. Every view-bound tool also declares an `outputSchema` — the validated `structuredContent` becomes the View's typed props (`useToolContext().toolOutput`). There are no wrapper/re-export View dirs; writes and secondary reads stay viewless.

| View (dir)         | Bound tool                     | Component                              | Props (from `toolOutput`)                                                                                                                                                  | CTA (calls a viewless tool via `useDynamicTool`) |
| ------------------ | ------------------------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `course-search`    | `search-courses`               | `views/course-search/view.tsx` | `{ results: [{ code, name, creditUnits?, sections: [{ classId?, section, professorName, timings[] }] }] }`                                                                   | `add-class-to-timetable` per section             |
| `bid-recommendation` | `recommend-bid-amount`       | `views/bid-recommendation/view.tsx` | `{ classId, acadTermId, bidWindow?, predictedMedian, suggestedBidAmount, multiplierUsed?, rationale? }`                                                                  | `upsert-bid` (when `bidWindow` present)          |
| `calendar-links`   | `get-timetable-calendar-link`  | `views/calendar-links/view.tsx` | `{ timetableId, madeLinkShareable? }` (URLs arrive via `_meta`, see below)                                                                                                 | External subscribe links (`_meta` URLs)          |
| `bid-plan`         | `my-bid-plan`                  | `views/bid-plan/view.tsx`      | `{ acadTermId, budget: { balance } \| null, bids: [{ id, bidAmount, status, courseCode, courseName, section, professorName, round, window }] }`                              | —                                                |
| `roadmap-view`     | `get-my-roadmap`               | `views/roadmap-view/view.tsx`  | `{ roadmapId, name, isPublic, owner, voteCount, entries: [{ yearNumber, term, courseCode, courseName, creditUnits }] }`                                                     | `copy-public-roadmap` when `isPublic`            |
| `review-cards`     | `get-course-reviews`           | `views/review-cards/view.tsx`  | `{ context, reviews: [{ id, body, tips, rating, labels, voteCount, createdAt, courseCode, professorName }] }`                                                                | — (`get-professor-reviews` is viewless)          |
| `bid-explorer`     | `explore-bid-options`          | `views/bid-explorer/view.tsx`  | `{ classId \| null, history: [{ acadTermId, round, window, min, median, vacancy }], prediction: { medianPredicted, minPredicted, bidWindow: { id, round, window } } \| null, safetyFactors: [{ beatsPercentage, multiplier }] }` | `upsert-bid` with `bidWindowId` + slider        |

#### View result plumbing

Tool results carry three channels (`src/mcp/view-tools/*`):

- **`content` (text):** what the model sees — a short summary line, not the raw payload.
- **`structuredContent`:** the full payload, validated against the tool's `outputSchema`. The model reads it and the View receives it as typed props via `useToolContext().toolOutput`.
- **`_meta` (View-only secrets):** delivered to the View through `useToolContext().meta` but **not** part of `structuredContent` and not validated by the `outputSchema`. `get-timetable-calendar-link` puts the bearer-bearing iCal URLs here so they never enter model context — the model only sees `timetableId`.

Write CTAs inside Views call **viewless** tools via `useDynamicTool("upsert-bid" | "add-class-to-timetable" | "copy-public-roadmap", ...)` — the name-typed `useCallTool` hook only works for exported ToolRefs (see [ADR-0002](docs/decisions/adr-0002-mcp-use-v2-toolref-strategy.md)). CTAs only render when the host can call tools (`useHostContext().isAvailable`).

Shared View styling lives in `views/shared/` (`tokens.tsx` = `TOKENS` light/dark palettes + `Skeleton` pending component; `use-cta-feedback.ts` = transient Done/Error CTA feedback). Every View shows a skeleton pending state while `toolOutput` is unset.

## Security

- **Fail-closed auth.** Every tool resolves the caller from `ctx.auth.user` (`src/mcp/user.ts`); unauthenticated calls return an error instead of running. The only exception is the explicit local dev bypass (`NODE_ENV=development` + `MCP_DEV_BYPASS=true`), which resolves a fixed seeded dev user — never active in production.
- **Transport security is mcp-use built-in (v2).** The server is mounted at `basePath` (default `/mcp`) — that same prefix serves the Inspector (`/mcp/inspector`) and view assets (`/mcp/_mcp-use/views/...`). Localhost-class binds get DNS-rebinding protection (Host validation on every request, Origin validation on non-GET/HEAD) automatically; `allowedHosts` / `allowedOrigins` extend the allowlists for production hosts (the repo does not set them — add them in `src/mcp/server.ts` if the host needs it). `MCP_URL` overrides the public origin behind proxies/tunnels (set `MCP_ASSETS_URL` only if view JS/CSS are served from a CDN — the repo does not set it).
- **Per-user write rate limit (DB-backed).** Every non-read-only tool shares one per-user write budget of `mcpRateLimitPerMinute` calls/minute (from `getChatConfig()`, default 60), keyed `mcp-write:<userId>`. Exhausted budget → a friendly error. Read tools are unaffected.
- **`my-bids` scrubs `notes`.** Each bid's free-text `notes` field (user PII / private bidding strategy) is dropped from the JSON returned to the model; bid metadata is preserved.
- **`get-classes` caps at 20 rows.** Any `limit > 20` is clamped to 20 before querying (larger values still accepted for backward compatibility).
- **iCal bearer URLs stay out of model context.** `get-timetable-calendar-link` delivers bearer iCal URLs via the result's `_meta` (View-only channel, read by the View via `useToolContext().meta`); `my-timetables` / `my-roadmaps` scrub `shareToken` / `icalToken`.
- **`set-bid-budget` capped at `MAX_BUDGET` (10000).** Balances above `MAX_BUDGET` are rejected with a clear error.
- **Visibility tooling consolidated on `set-roadmap-visibility`.** PRIVATE / UNLISTED / PUBLIC; PUBLIC requires a verified account, and PRIVATE unpublishes from the public gallery (`sharing.setVisibility` implements both).

## Environment variables

`src/mcp/server.ts` reads these server env vars and passes them **explicitly** to `oauthSupabaseProvider({ projectId, supabaseUrl, jwtSecret })` — the provider does not auto-read env vars (set them in the host's dashboard):

| Variable                            | Purpose                                                                                                                                                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MCP_USE_OAUTH_SUPABASE_PROJECT_ID` | **Required.** Supabase project ref. `oauthSupabaseProvider()` derives the auth URL `https://<ref>.supabase.co` from it.                                                                                                                    |
| `MCP_USE_OAUTH_SUPABASE_URL`        | _Optional._ Full Supabase auth URL — only for **local / self-hosted** Supabase (e.g. `http://localhost:54321`). Overrides the URL derived from `MCP_USE_OAUTH_SUPABASE_PROJECT_ID`.                                                        |
| `MCP_USE_OAUTH_SUPABASE_JWT_SECRET` | _Optional._ Only for **legacy HS256** Supabase JWT projects. Omit for the default RS256 (JWKS-verified) projects.                                                                                                                          |
| `MCP_DEV_BYPASS`                    | _Dev only._ Set `true` to resolve unauthenticated MCP tool calls as the seeded dev user. Ignored unless `NODE_ENV === "development"`; never active in production. |
| `MCP_DEV_USER_EMAIL`                | _Dev only._ Email of the dev user for the bypass (default `test_hash_pwd@smu.edu.sg` — must exist in the local seeded DB). |
| `DATABASE_URL`                      | The same Postgres the Next.js app uses — tools read via the tRPC caller (Prisma).                                                                                                                                                          |
| `SKIP_ENV_VALIDATION`               | **Do not set.** With the flag set, `@t3-oss/env-nextjs` skips the env schema transforms, so `NEXT_PUBLIC_SUPPORTED_SCH_DOMAINS` stays a comma-string and `src/common/tools/zod/schemas.ts` crashes on `.join()` at boot. Provide the full app env set instead. |
| Full Next.js app env                | `env` validation runs on the mcp process (it imports `@/env` via tRPC), so the host needs the same server vars as the app: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `LLM_API_KEY`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, plus the `NEXT_PUBLIC_*` vars below. The repo `.env` already has these. |
| `NEXT_PUBLIC_*` vars                | Any client env var a tool path reads (e.g. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPPORTED_SCH_DOMAINS`). Add more as runtime errors surface.                                                              |
| `NEXT_PUBLIC_MCP_PUBLIC_URL`        | _Optional._ Public MCP URL used by the Settings -> Agents connect page deep links (`src/modules/settings/agents/connect-links.ts` -> `MCP_PUBLIC_URL`). Falls back to the placeholder until deployed.                                       |

> **`MCP_USE_OAUTH_SUPABASE_PUBLISHABLE_KEY` is NOT a server env var.** The server never reads it — `src/mcp/server.ts` only reads `MCP_USE_OAUTH_SUPABASE_PROJECT_ID`, `MCP_USE_OAUTH_SUPABASE_URL` and `MCP_USE_OAUTH_SUPABASE_JWT_SECRET` and passes them explicitly to `oauthSupabaseProvider()`. The publishable key (`sb_publishable_...`) is a **client-facing** Dynamic Client Registration (DCR) credential: MCP clients obtain it from Supabase's OAuth authorization-server metadata, which the mcp-use server proxies at `/.well-known/oauth-authorization-server`. Setting it in the deployed server's env would be a no-op.

`src/mcp/server.ts` does not validate the full env set itself — validation happens when the tool stack imports `@/env`, so a missing variable surfaces at boot or on the first tool call. Start with the table above and add vars as needed.

## Supabase dashboard setup (human)

One-time configuration in the Supabase dashboard for the project used by `MCP_USE_OAUTH_SUPABASE_PROJECT_ID`:

1. **Authentication -> OAuth Server** (the Supabase OAuth 2.1 server, which powers MCP auth).
2. Enable the **OAuth 2.1 server**.
3. Enable **Allow Dynamic OAuth Apps** (needed so MCP clients can register themselves via DCR).
4. Set the **Authorization Path** to `/oauth/consent` — Supabase redirects the user here with `?authorization_id=...`; the app's consent screen (`src/app/oauth/consent/page.tsx`) approves/denies.
5. Under **Authentication -> URL Configuration**, set **Site URL** to `https://afterclass.io` (prod) or `http://localhost:3000` (local dev) so the authorization path resolves against the right origin.
6. Copy the **project ref** into the deployed server's env vars as `MCP_USE_OAUTH_SUPABASE_PROJECT_ID` (see table above). The **publishable key** is client-facing — MCP clients obtain it from Supabase's OAuth metadata (which the server proxies), so no server env var is needed for it.

The consent route requires a signed-in session whose Auth.js JWT carries a Supabase access token (kept server-only in the encrypted session cookie; read via `src/server/auth/supabase-access-token.ts`). Without it the route returns 401.

## Known limitations

1. **Supabase-identity only (prod).** Supabase-issued MCP tokens identify users with a Supabase identity (`src/mcp/user.ts` resolves the caller from `ctx.auth.user`). A Google-only user (no linked Supabase identity) cannot connect an agent until a Supabase identity is linked to their account. Local dev sidesteps this entirely via the [dev bypass](#local-dev-mode-no-supabase-required).
2. **~1h access-token expiry in consent.** The Supabase access token captured at sign-in expires after roughly one hour. A stale consent attempt surfaces a Supabase auth error on the consent route (400) — the user should re-login. A refresh-token flow is tracked for later (documented in `src/server/supabase-consent.ts`).

## Deploy

> **Prerequisite (prod):** enable the `pg_trgm` extension in Supabase (Dashboard -> Database -> Extensions). The fuzzy/typo-tolerant course search (`search-courses`) depends on it.

### Primary: Manufact Cloud

From the repo root:

```bash
bunx mcp-use login
bunx mcp-use deploy --root-dir .
```

The CLI detects the mcp-use project (`src/mcp`). If the repo is not connected to GitHub, add `--no-github` (uploads source without linking). Set the env vars from the [table above](#environment-variables) in the Manufact dashboard for the deployed server, then record the public MCP URL (e.g. `https://<slug>.run.mcp-use.com/mcp`) and set it as `NEXT_PUBLIC_MCP_PUBLIC_URL` in the host's env (read by `connect-links.ts` -> `MCP_PUBLIC_URL`).

### Fallback: any Node host

If Manufact is not acceptable, run the server on any Node host (Railway / Fly.io / Cloud Run) with the same env vars and port `3000` exposed:

```bash
bunx mcp-use build --mcp-dir src/mcp
bunx mcp-use start --mcp-dir src/mcp
```

Set `NEXT_PUBLIC_MCP_PUBLIC_URL` to the deployed URL.

## Local dev mode (no Supabase required)

`src/mcp/server.ts` only wires `oauthSupabaseProvider()` when `NODE_ENV !== "development"`. The mcp-use CLI sets `NODE_ENV=development` for `mcp:dev` (and `production` for `mcp:start`), so local dev runs the server **without** any bearer middleware — no Supabase project, no consent screen, no `MCP_USE_OAUTH_SUPABASE_*` needed. (In production, a missing `MCP_USE_OAUTH_SUPABASE_PROJECT_ID` / `MCP_USE_OAUTH_SUPABASE_URL` fails at startup with a clear error instead of a cryptic 401 on the first request.)

When an MCP call arrives with no identity, `src/mcp/user.ts` falls back to the **dev bypass**: if `NODE_ENV === "development"` and `MCP_DEV_BYPASS=true`, it resolves the caller as `MCP_DEV_USER_EMAIL` (default the seeded `test_hash_pwd@smu.edu.sg`). A real bearer token is still resolved through the normal identity path, and everything still fail-closes when the dev user is missing from the DB or the bypass flag is off.

**How to test locally:**

1. `bun run db:reset` (seeds the dev user + data into local Postgres on `:5433`).
2. `bun run mcp:dev` → wait for `[SERVER] Listening on http://0.0.0.0:3001` (~20–40s, loads all tRPC routers).
3. Open `http://localhost:3001/mcp/inspector`, hit **Connect** — no OAuth prompt.
4. `tools/list` shows the 49 tools; call e.g. `search-courses`, `my-bid-plan`, or `recommend-bid-amount`.
5. View-bound tools (`search-courses`, `recommend-bid-amount`, `my-bid-plan`, `explore-bid-options`, `get-course-reviews`, `get-my-roadmap`, `get-timetable-calendar-link`) render the 7 MCP Apps Views in the Inspector.

All calls run as the single dev user (`test_hash_pwd@smu.edu.sg`), so the per-user write budget still applies to that user.

## Local commands

| Command             | What it does                                                                    |
| ------------------- | ------------------------------------------------------------------------------- |
| `bun run mcp:dev`   | Dev server + Inspector on `:3001` (`mcp-use dev --mcp-dir src/mcp --port 3001`) — no OAuth, dev-bypass user |
| `bun run mcp:build` | Build the server + Views (`mcp-use build --mcp-dir src/mcp`)                     |
| `bun run mcp:start` | Start the production server (`mcp-use start --mcp-dir src/mcp`) — OAuth required |
| `bunx mcp-use typecheck` | Refreshes `mcp-env.d.ts` (generated from the exported ToolRefs in `src/mcp/index.ts`) and runs `tsc --noEmit` |

Versions: `mcp-use@^2` (server) with `@mcp-use/cli@^4` (the v2-compatible CLI).

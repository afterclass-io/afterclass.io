# afterclass.io MCP server

The afterclass.io Model Context Protocol (MCP) server, built on [mcp-use](https://mcp-use.com). It exposes the shared tool catalog (`src/server/mcp/tools` — the same 44 tools the in-app assistant uses) as a remote, OAuth-protected MCP server with 7 MCP Apps widgets.

- **Server entry:** `src/mcp/index.ts`
- **Tool wiring:** `src/mcp/register.ts` + `src/mcp/user.ts`
- **Widgets:** `src/mcp/resources/*/widget.tsx`
- **Local dev:** `bun run mcp:dev` → Inspector at `http://localhost:3001/inspector`

> **Local dev needs no Supabase.** `mcp:dev` runs the server with **no OAuth middleware** (see [Local dev mode](#local-dev-mode-no-supabase-required)). The Inspector connects instantly and tool calls resolve as the seeded dev user. The Supabase OAuth 2.1 flow described below only kicks in outside development (deployed servers, `mcp:start`).

## Architecture

```
+-----------------------------+      +--------------------------------------------+
|  Next.js app (Vercel)       |      |  mcp-use server (this repo: src/mcp/)      |
|                             |      |                                            |
|  - website                  |      |  - MCP transport (streamable HTTP)         |
|  - Supabase identity        |      |  - 44 tools from the shared catalog        |
|  - consent screen           |      |    (src/server/mcp/tools - single source   |
|    /oauth/consent           |      |     of truth, shared with the assistant    |
|                             |      |     widget)                                |
+--------------+--------------+      |  - MCP Apps widgets (7)                  |
               |                     |    (resources/bid-recommendation,          |
               | redirects here      |     resources/course-search,               |
               v                     |     resources/calendar-links,              |
+-------------------------------------+     resources/bid-plan,                  |
|  Supabase Auth (hosted OAuth 2.1    |     resources/roadmap-view,              |
|  authorization server)              |     resources/review-cards,              |
|  - issues MCP tokens                |     resources/bid-explorer)              |
|  - Dynamic Client Registration      |               +----------------------------+
+-------------------------------------+              | token verification
                                                     |  (JWT), DCR metadata
                                                     |  proxy
```

Three moving parts:

1. **Next.js app (Vercel)** — the website, Supabase-backed sign-in, and the hosted consent screen at `/oauth/consent` (`src/app/oauth/consent/page.tsx` + `src/app/api/oauth/consent/route.ts`). The user approves or denies an authorization request from this screen.
2. **mcp-use server (`src/mcp/`)** — the MCP transport (streamable HTTP); hosts the 44 tools from the shared catalog + 7 widgets, and runs `oauthSupabaseProvider()`. Deployed independently of the Next.js app (see [Deploy](#deploy)).
3. **Supabase Auth** — the hosted OAuth 2.1 authorization server: issues MCP access tokens, handles Dynamic Client Registration (DCR) for MCP clients, and redirects the user to the app's consent screen.

### Single source of truth for tools

All 44 tools live in `src/server/mcp/tools` (e.g. `search-courses`, `my-timetables`, `recommend-bid-amount`). The same catalog powers the **in-app assistant** (via the tRPC caller) and the **MCP server** (`src/mcp/register.ts` iterates `allTools` and registers each as an mcp-use tool, resolving the caller from the OAuth identity per call). A tool only needs to be changed in one place.

## Authorization / consent flow

> Only applies **outside development**. `mcp:dev` sets `NODE_ENV=development` and `src/mcp/index.ts` omits `oauth`, so no bearer middleware is mounted and the flow below is skipped entirely (see [Local dev mode](#local-dev-mode-no-supabase-required)).

The end-to-end OAuth 2.1 authorization-code flow with Supabase-hosted consent:

1. The **MCP client** discovers the server's OAuth metadata (`/.well-known/oauth-protected-resource` + the Supabase authorization-server metadata proxied by the server).
2. The client **registers itself** (DCR) with Supabase and redirects the user to Supabase's **authorize** endpoint.
3. Supabase redirects the user to the app's **consent screen** (`/oauth/consent?authorization_id=...`).
4. The consent screen loads the authorization details via the consent API route (already-consented clients are redirected straight back).
5. The user **approves or denies**; the screen calls `POST /api/oauth/consent` with `{ authorization_id, decision }`.
6. On approval, Supabase redirects back to the client with an **authorization code**.
7. The client exchanges the code at Supabase's **token** endpoint and uses the resulting MCP access token for `tools/list` / `tools/call`.

Under the hood: `src/server/supabase-consent.ts` (a per-call Supabase client authenticated with the user's access token) → `approveConsent` / `denyConsent` / `getConsentDetails` → the consent route/page. On every call the token is verified by `oauthSupabaseProvider()` (Supabase JWKS); each tool resolves the caller from `ctx.auth.user` via `src/mcp/user.ts` → `createCallerForUser` (a user-scoped tRPC caller) and **fails closed** when unauthenticated.

## Tool catalog (44 tools)

The shared catalog exposes 44 tools over MCP (24 readOnly + 20 write), defined in `src/server/mcp/tools` — read tools under `tools/read/`, write tools under `tools/write/`, aggregated in `tools/index.ts`. readOnly tools are annotated `readOnlyHint` and skip the write budget.

Tool families:

- **Courses / classes / professors + ranked search** — course and class detail with ranked, senior-informed candidates (`search-courses`, `get-course`, `get-classes`, `list-acad-terms`).
- **Catalog** — reviews, bid results / predictions / windows, and academic terms (`get-course-reviews`, `get-professor-reviews`, `get-bid-results`, `get-bid-windows`, `get-contribute-info`).
- **Own data** — timetables, roadmaps, bids, budget, usage (`my-timetables`, `my-roadmaps`, `my-bids`, `my-bid-plan`, `get-budget`, `get-usage`, `get-me`).
- **Planning** — `plan-semester`, `check-roadmap-feasibility`, `get-my-timetable-detail`.
- **Write tools** — bids, timetables, roadmaps, roadmap settings, bid status, calendar links, recommend (`upsert-bid`, `set-bid-budget`, `set-bid-status`, `set-matric-term`, `set-active-roadmap`, `sync-roadmap-progress`, `copy-public-roadmap`, `set-roadmap-visibility`, `get-timetable-calendar-link`, `recommend-bid-amount`).

Two companion surfaces are registered alongside the tools:

| Surface                | Kind     | Purpose                                                             |
| ---------------------- | -------- | ------------------------------------------------------------------- |
| `plan-semester`        | Prompt   | User-selectable template steering the model toward the `plan-semester` workflow instead of a long tool chain. |
| `catalog://acad-terms` | Resource | The academic terms the course catalog is offered in (`id` = `acadTermId` used by `search-courses` and `plan-semester`). |

### MCP Apps widgets (7)

| Widget               | Tool(s)                                       | Component                                          | Props (summary)                                                                                                                              | CTA |
| -------------------- | --------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| `course-search`      | `search-courses`                              | `src/mcp/resources/course-search/widget.tsx`       | `{ results: [{ code, name, creditUnits?, sections: [{ classId?, section, professorName, timings[] }] }] }`                                   | — |
| `bid-recommendation` | `recommend-bid-amount`                        | `src/mcp/resources/bid-recommendation/widget.tsx`  | `{ classId, acadTermId, bidWindow?, predictedMedian, suggestedBidAmount, multiplierUsed?, rationale? }`                                      | — |
| `calendar-links`     | `get-timetable-calendar-link`                 | `src/mcp/resources/calendar-links/widget.tsx`      | `{ feedUrl, subscribeUrl, googleSubscribeUrl, appleSubscribeUrl, outlookSubscribeUrl, madeLinkShareable? }` via `widgetProps`                | External subscribe links |
| `bid-plan`           | `my-bid-plan`                                 | `src/mcp/resources/bid-plan/widget.tsx`            | `{ acadTermId, budget: { balance } \| null, bids: [{ id, bidAmount, status, courseCode, courseName, section, professorName, round, window }] }` | — |
| `roadmap-view`       | `get-my-roadmap`, `get-public-roadmap`        | `src/mcp/resources/roadmap-view/widget.tsx`        | `{ roadmapId, name, isPublic, owner, voteCount, entries: [{ yearNumber, term, courseCode, courseName, creditUnits }] }`                      | `copy-public-roadmap` when `isPublic` |
| `review-cards`       | `get-course-reviews`, `get-professor-reviews` | `src/mcp/resources/review-cards/widget.tsx`        | `{ context, reviews: [{ id, body, tips, rating, labels, voteCount, createdAt, courseCode, professorName }] }`                                | — |
| `bid-explorer`       | `explore-bid-options`                         | `src/mcp/resources/bid-explorer/widget.tsx`        | `{ classId \| null, history: [{ acadTermId, round, window, min, median, vacancy }], prediction: { medianPredicted, minPredicted, bidWindow: { id, round, window } } \| null, safetyFactors: [{ beatsPercentage, multiplier }] }` | `upsert-bid` with `bidWindowId` + slider |

#### Widget props plumbing

Two paths deliver props to a widget:

- **`toWidgetProps` (default):** parses the tool's JSON `text` output into widget props — a normalized view of the model-visible JSON.
- **`ToolResult.widgetProps` (secret channel):** `src/server/mcp/types.ts` defines an optional `widgetProps?: Record<string, unknown>` on `ToolResult`. When present, `src/mcp/register.ts` prefers it over `toWidgetProps` via `widget({ props: result.widgetProps ?? tool.toWidgetProps!(result), output })`. The `output` (plain text) is what the model sees; `props` becomes widget-only `structuredContent`. This keeps bearer secrets out of model context.

`get-timetable-calendar-link` uses `widgetProps` so iCal URLs (bearer tokens) never enter model-visible text — the model only sees "Calendar subscribe links are shown in the widget...". All other widgets use the `toWidgetProps`-parses-text pattern.

Shared widget styling lives in `src/mcp/resources/shared/tokens.tsx` (`TOKENS` light/dark palettes + `Skeleton` pending component). Every widget shows a skeleton pending state while `toolOutput` is null.

## Security

- **Fail-closed auth.** Every tool resolves the caller from `ctx.auth.user` (`src/mcp/user.ts`); unauthenticated calls return an error instead of running. The only exception is the explicit local dev bypass (`NODE_ENV=development` + `MCP_DEV_BYPASS=true`), which resolves a fixed seeded dev user — never active in production.
- **Per-user write rate limit (DB-backed).** Every non-read-only tool shares one per-user write budget of `mcpRateLimitPerMinute` calls/minute (from `getChatConfig()`, default 60), keyed `mcp-write:<userId>`. Exhausted budget → a friendly error. Read tools are unaffected.
- **`my-bids` scrubs `notes`.** Each bid's free-text `notes` field (user PII / private bidding strategy) is dropped from the JSON returned to the model; bid metadata is preserved.
- **`get-classes` caps at 20 rows.** Any `limit > 20` is clamped to 20 before querying (larger values still accepted for backward compatibility).
- **iCal bearer URLs stay out of model context.** `get-timetable-calendar-link` delivers bearer iCal URLs via `ToolResult.widgetProps` (widget-only); `my-timetables` / `my-roadmaps` scrub `shareToken` / `icalToken`.
- **`set-bid-budget` capped at `MAX_BUDGET` (10000).** Balances above `MAX_BUDGET` are rejected with a clear error.
- **Visibility tooling consolidated on `set-roadmap-visibility`.** PRIVATE / UNLISTED / PUBLIC; PUBLIC requires a verified account, and PRIVATE unpublishes from the public gallery (`sharing.setVisibility` implements both).

## Environment variables

`oauthSupabaseProvider()` reads these server env vars (set them in the host's dashboard):

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

> **`MCP_USE_OAUTH_SUPABASE_PUBLISHABLE_KEY` is NOT a server env var.** The server never reads it — `oauthSupabaseProvider()` only reads `MCP_USE_OAUTH_SUPABASE_PROJECT_ID`, `MCP_USE_OAUTH_SUPABASE_URL` and `MCP_USE_OAUTH_SUPABASE_JWT_SECRET`. The publishable key (`sb_publishable_...`) is a **client-facing** Dynamic Client Registration (DCR) credential: MCP clients obtain it from Supabase's OAuth authorization-server metadata, which the mcp-use server proxies at `/.well-known/oauth-authorization-server`. Setting it in the deployed server's env would be a no-op.

`src/mcp/index.ts` does not validate env vars itself — validation happens when the tool stack imports `@/env`, so a missing variable surfaces at boot or on the first tool call. Start with the table above and add vars as needed.

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

`src/mcp/index.ts` only wires `oauthSupabaseProvider()` when `NODE_ENV !== "development"`. The mcp-use CLI sets `NODE_ENV=development` for `mcp:dev` (and `production` for `mcp:start`), so local dev runs the server **without** any bearer middleware — no Supabase project, no consent screen, no `MCP_USE_OAUTH_SUPABASE_*` needed.

When an MCP call arrives with no identity, `src/mcp/user.ts` falls back to the **dev bypass**: if `NODE_ENV === "development"` and `MCP_DEV_BYPASS=true`, it resolves the caller as `MCP_DEV_USER_EMAIL` (default the seeded `test_hash_pwd@smu.edu.sg`). A real bearer token is still resolved through the normal identity path, and everything still fail-closes when the dev user is missing from the DB or the bypass flag is off.

**How to test locally:**

1. `bun run db:reset` (seeds the dev user + data into local Postgres on `:5433`).
2. `bun run mcp:dev` → wait for `[SERVER] Listening on http://0.0.0.0:3001` (~20–40s, loads all tRPC routers).
3. Open `http://localhost:3001/inspector`, hit **Connect** — no OAuth prompt.
4. `tools/list` shows the 44 tools; call e.g. `search-courses`, `get-me`, or `recommend-bid-amount`.
5. Widget-backed tools (`search-courses`, `recommend-bid-amount`, `my-bid-plan`, `explore-bid-options`, reviews, roadmap, calendar-link) render the 7 MCP Apps widgets in the Inspector.

All calls run as the single dev user (`test_hash_pwd@smu.edu.sg`), so the per-user write budget still applies to that user.

## Local commands

| Command             | What it does                                                                    |
| ------------------- | ------------------------------------------------------------------------------- |
| `bun run mcp:dev`   | Dev server + Inspector on `:3001` (`mcp-use dev --mcp-dir src/mcp --port 3001`) — no OAuth, dev-bypass user |
| `bun run mcp:build` | Build the server + widgets (`mcp-use build --mcp-dir src/mcp`)                  |
| `bun run mcp:start` | Start the production server (`mcp-use start --mcp-dir src/mcp`) — OAuth required |

Versions: `mcp-use@^1` (server) with `@mcp-use/cli@^3` (the v1-compatible CLI).

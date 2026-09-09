# afterclass.io MCP server

The afterclass.io Model Context Protocol (MCP) server uses mcp-use v2 and
streamable HTTP to expose the same 50-tool catalog used by the in-app
assistant. Production access is protected by Supabase OAuth 2.1; local
development can use the seeded development user without Supabase.

## Architecture

- `src/server/mcp/tools` is the single source of truth for the catalog. Tools
  cover courses, classes, professors, reviews, bidding, timetables, roadmaps,
  planning, and calendar links. Read tools are annotated read-only; writes
  return the updated plan or roadmap where useful.
- `src/mcp/index.ts` exposes the shared server from `src/mcp/server.ts`.
  `src/mcp/register.ts` registers 43 viewless tools; `src/mcp/view-tools/`
  registers the seven view-bound tools.
- `views/<name>/view.tsx` contains the seven MCP Apps Views: `course-search`,
  `calendar-links`, `bid-plan`, `roadmap-view`, `review-cards`,
  `bid-explorer`, and `timetable`.
- Each View is bound to exactly one canonical tool and receives validated
  `structuredContent` through its output schema. The remaining tools return
  text-only MCP results. View CTAs call viewless tools dynamically; secrets
  such as calendar URLs use `_meta` and never enter model text.
- `src/mcp/prompts.ts` provides planning and review prompts, while
  `src/mcp/resources.ts` provides `catalog://acad-terms`.

## Safety and limits

Destructive writes require an explicit `confirm: true` retry after the user
has seen what will change. This covers bid, budget, roadmap, visibility,
calendar-link, and other destructive operations. The shared dispatch path
enforces per-user read and write budgets, rejects oversized or invalid inputs,
and records successful writes in the secret-scrubbed audit log. Chat uses the
same tools and gates, with its own per-user write budget and a 24k-character
tool-result limit.

## Authentication

Outside development, `oauthSupabaseProvider` verifies Supabase-issued bearer
tokens and resolves each call to a user-scoped tRPC caller. The web app hosts
`/oauth/consent` and its consent API; users approve or deny client requests
there before Supabase issues an authorization code. Configure
`MCP_USE_OAUTH_SUPABASE_PROJECT_ID`, and set
`MCP_USE_OAUTH_SUPABASE_URL` only for a self-hosted Supabase instance;
`MCP_USE_OAUTH_SUPABASE_JWT_SECRET` is only for legacy HS256 projects.
Production also needs the application `DATABASE_URL` and the environment
required by the imported Next.js server modules. Unauthenticated calls fail
closed.

## Local development

Run `bun run db:reset` to seed the local database, then run
`bun run mcp:dev`. Open `http://localhost:3001/mcp/inspector`, connect, and
use `tools/list` or call a tool such as `search-courses`, `my-bid-plan`, or
`recommend-bid-amount`. The development server omits OAuth; set
`MCP_DEV_BYPASS=true` to resolve calls as the seeded user, optionally changing
`MCP_DEV_USER_EMAIL` to another local user.

Useful commands:

- `bun run mcp:dev` starts the development server and Inspector.
- `bun run mcp:build` builds the server and Views.
- `bun run mcp:start` starts the production server with OAuth.
- `bunx mcp-use typecheck` regenerates `mcp-env.d.ts` from exported ToolRefs
  and runs TypeScript checking.

For deployment, build with `bunx mcp-use build --mcp-dir src/mcp` and start
with `bunx mcp-use start --mcp-dir src/mcp` on a long-lived Node host. The
Next.js web app and consent route may run separately; set the public MCP URL
in the web app so agent connection links point to the deployed server.

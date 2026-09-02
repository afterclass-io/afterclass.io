---
# Configuration for the Jekyll template "Just the Docs"
parent: Decisions
nav_order: 2
title: mcp-use v2 ToolRef / View strategy
# These are optional elements. Feel free to remove any of them.
status: accepted
date: 2026-09-03
---

# mcp-use v2 ToolRef / View strategy

## Context and Problem Statement

The MCP server (`src/mcp/`) was built on mcp-use v1 (`mcp-use@1.34.6` + `@mcp-use/cli@3.6.7`), which is no longer the supported line. v1 used `mcp-use/server` imports, `widget: { name }` declarations, `resources/<name>/widget.tsx` components reading `useWidget()`, and server-side helpers (`toWidgetProps` unwrapping, `widget({ props, output })`) to wire tools to widgets. mcp-use v2 (2.3.4 / CLI 4.1.8) removes all of those APIs. Migrating required deciding how the 49-tool catalog maps onto the v2 model — in particular which tools get a View, how Views reach the shared server instance for type generation, and how write actions are initiated from Views.

## Decision Drivers

- mcp-use v2 enforces **one View per bound tool** (the `view` config lives on the tool registration).
- MCP App Views must stay dependency-free (no `@/server/*`, no `next/*`) but still need typed props.
- `mcp-env.d.ts` type generation derives the View→tool typing from **exported values** in the server entry module.
- Keep the single source of truth for tools (`src/server/mcp/tools`) and the per-user write budget intact.

## Considered Options

- One View per canonical tool, all other tools viewless (chosen)
- Keep multi-tool widget bindings by creating wrapper/re-export View dirs around write tools
- Register every tool individually at module scope (no loop registration)

## Decision Outcome

Chosen option: "One View per canonical tool, all other tools viewless", because it matches the v2 runtime constraint (a second tool naming the same view is rejected by `server.tool()` — a View may have at most one bound tool), keeps the 7 genuinely-visual surfaces, and avoids duplicating tool wiring in wrapper directories.

Concretely:

- **(a) 7 View directories, one bound tool each.** `src/mcp/views/<name>/view.tsx` for: `course-search` ← `search-courses`, `bid-recommendation` ← `recommend-bid-amount`, `calendar-links` ← `get-timetable-calendar-link`, `bid-plan` ← `my-bid-plan`, `roadmap-view` ← `get-my-roadmap`, `review-cards` ← `get-course-reviews`, `bid-explorer` ← `explore-bid-options`. Binding is declared in each tool's registration via `view: { name: ... }` (`src/mcp/view-tools/*`).
- **(b) No wrapper/re-export View dirs.** v1's `bid-plan` widget (bound to 6 tools) and `roadmap-view` widget (bound to 6 tools) collapse to their canonical read tools; write tools do not get Views of their own.
- **(c) 42 viewless tools are loop-registered** in `src/mcp/register.ts` (`registerViewlessTools`), returning raw wire envelopes `{ content, structuredContent, _meta }` with no `view:` config and no `outputSchema`. `_meta` is reserved for View-only secrets (calendar-links' bearer iCal URLs).
- **(d) ToolRefs exported at module scope** from `src/mcp/view-tools/*` against the single shared `MCPServer` instance in `src/mcp/server.ts` (re-exported by `src/mcp/index.ts`). The exported values (not factory functions) are what `mcp-env.d.ts` generation reads to type `useCallTool` for view-bound tools. `mcp-use typecheck` (run inside `mcp-use dev`/`build`) regenerates `mcp-env.d.ts`.

### Consequences

- Good, because the catalog stays in one place — view-bound tools wrap `allTools` entries rather than re-implementing them.
- Good, because View props are zod-validated (`outputSchema` → `structuredContent`) before reaching View code, and `_meta` keeps secrets out of model context.
- Bad, because write CTAs inside Views cannot use the name-typed `useCallTool` for viewless tools — they must use `useDynamicTool("upsert-bid" | "add-class-to-timetable" | "copy-public-roadmap", ...)` with an explicit inline call contract (`useCallTool`'s name typing requires exported ToolRefs).
- Bad, because secondary reads that were previously re-rendered by a widget (e.g. `get-professor-reviews` → review-cards) are now text-only; the model describes results instead of a View rendering them.

## Validation

- `src/mcp/register.ts` exports `viewBoundNames` and skips exactly those in the viewless loop; a drift between the set and the 7 exported ToolRefs fails tool-catalog tests.
- `bunx mcp-use typecheck` regenerates `mcp-env.d.ts` and runs `tsc --noEmit`; both the vitest suite and the typecheck gate the migration.
- `bun run mcp:build` builds the 7 Views and hashes them under `.mcp-use/build/views/`.

## More Information

- Migration reference: [mcp-use v2 TypeScript server migration guide](https://docs.mcp-use.com/v2/typescript/server/migration)
- User-facing documentation: `MCP.md` (architecture, Views table, environment variables)
- Prior decision: [ADR-0001 — Use Magic Link for Authentication](0001-magic-link-for-auth.md) (authentication choice predating the MCP server)

# Assistant Module

The **Assistant** module powers both the floating chat widget (bottom-right, draggable/resizable) and the full-page chat at `/assistant`. Both share one hand-rolled chat stack built on the **AI SDK** (`useChat` + `DefaultChatTransport` → `POST /api/chat`) — there is **no assistant-ui** layer and **no file upload** (the composer is text-only by design).

Signed-in users can ask natural-language questions about SMU courses, professors, timetables, bids, and roadmaps. The chat answers using the same MCP skill catalog available to external AI agents, streams tool calls as live cards, and persists sessions **on this device only** (IndexedDB).

## Architecture

```
User opens widget → AssistantProvider mounts → GET /api/assistant/status
                                                    │
                                    ┌─ signedIn:false → SignedOutPanel (login CTA)
                                    │
                                    └─ signedIn:true ─────────────────────┐
                                          │                                │
                                    spendPaused? ──yes──→ ConnectGate     │
                                          │               "spend"          │
                                          │ no                             │
                                          ▼                                │
                          AssistantWidget (controlled open/onOpenChange)   │
                          ├─ ChatPanel (useChat + DefaultChatTransport)    │
                          └─ WelcomeBubble (random engagement, 7d/3× max)  │
                                          │                                │
                                    User sends message ────────────────────┘
                                          │
                                          ▼
                    POST /api/chat (streaming, DefaultChatTransport)
                                          │
                          ┌───────────────┼───────────────┐
                          ▼               ▼               ▼
              canned.ts short-circuit  checkSpendGuard()  checkAndIncrement()
              (static prompts → instant        │               │
               answer, BEFORE quota reserve)  exceeded? → 403  exceeded? → 429
                                              {gate:"spend"}               │
                                                          reserveMessage() │
                                                          exceeded? → 403   │
                                                          {gate:"quota"}    │
                                          │               │               ▼
                                          │               │    trimToBudget(messages)
                                          │               │               │
                                          │               │               ▼
                                          │               │    buildAssistantTools(ctx)
                                          │               │               │
                                          │               │               ▼
                                          │               │    getModel() → LLM_MODEL
                                          │               │    (LLM_* env)
                                          │               │               │
                                          │               │               ▼
                                          │               │    streamText({ model, tools, … })
                                          │               │               │
                                          │               │               ▼
                                          │               │    SSE stream → useChat renders
                                          │               │    (tool cards, markdown)
                                          │               │               │
                                          │               │               ▼
                                          │               │    onEnd → settleUsage(userId, {input, output})
                                          │               │         ChatUsage row (token count + USD spend)
                                          │               │         ChatSpend row (global monthly spend)
```

- **StrictMode is enabled** (`reactStrictMode: true` in `next.config.js`). The old assistant-ui workaround that forced StrictMode off (issue #5422) no longer applies — there is no custom assistant-ui store.
- The widget and `/assistant` read/write the **same** local store, so sessions sync between them. The widget hides itself on `/assistant` (`AssistantProvider` returns `null` there) so both are never live at once.
- Sessions are stored in **IndexedDB** (DB `afterclass-assistant`, store `sessions`) — device-only, capped at **50 sessions** and **200 messages/session**, with non-text tool parts stripped before persistence.

## Component Map

### Client (`src/modules/assistant/`)

| File | Purpose |
|---|---|
| `assistant-provider.tsx` | Top-level client component: fetches `/api/assistant/status`, picks the panel per auth state, owns `open` state, restores the widget after the login redirect (`assistant-was-open` session flag), hides on `/assistant`. |
| `assistant-widget.tsx` | **Controlled** floating widget (`open`/`onOpenChange`): draggable launcher (bottom-right by default) + draggable header, resizable panel, "Open full chat" link. The box opens anchored to the launcher (its bottom-right corner sits at the launcher's). Geometry via `use-widget-position.ts` + `widget-geometry.ts`. |
| `signed-out-panel.tsx` | Anonymous state: login CTA → `/account/auth/login?callbackUrl=<page>` with the `assistant-was-open` restore flag. |
| `chat-panel.tsx` | Widget chat: `useChat` + `DefaultChatTransport({ api: "/api/chat" })`, suggestions, composer, message list, quota alert bar, gates (`onGate`). |
| `chat-page.tsx` | Full-page chat at `/assistant`: same `useChat` stack plus the session sidebar (`session-list.tsx`). |
| `composer.tsx` | Text-only input (no file upload), Enter to send / Shift+Enter for newline, stop button while streaming. |
| `message-list.tsx` / `message.tsx` / `markdown.tsx` | Rendered thread: user/assistant bubbles, markdown, streaming state. |
| `tool-call-card.tsx` | Collapsible live tool card driven by `ToolPart` (`tool-part.ts`) with step counts (`stepIndex`/`stepTotal`). |
| `suggestions.tsx` | `WELCOME_SUGGESTIONS` (templated start buttons) + `FOLLOW_UP_SUGGESTIONS`; picking one sends the prompt directly. |
| `quota-alert-bar.tsx` | Inline non-jarring alert above the composer at 50% / 10% / 0% remaining (amber/red tint, X dismiss persisted in sessionStorage). Logic in `quota-alert.ts`. |
| `quota-meter/` | Persistent subtle quota meter (`logic.ts` pure state + `quota-meter.tsx` progress bar). |
| `welcome-bubble/` | Random engagement bubble (`logic.ts`: `pickEngagementMessage`, 7-day interval, max 3 shows, 4s delay, 12s auto-dismiss). |
| `chat-store.ts` | Zustand store backed by IndexedDB (`idb.ts`) — `hydrate`, `createSession`, `saveSession`, `renameSession`, `deleteSession`, `setActive`. Caps/pruning in `chat-store-logic.ts`. |
| `session-list.tsx` | Sidebar session list shared by widget + `/assistant`. |
| `connect-gate.tsx` | Gate screen when quota exhausted or spend cap hit; links to `/settings/agents/connect`. |
| `mcp-recommendation.tsx` | One-click MCP App recommendation card (3 branded buttons). |
| `gate.ts` | `parseGateError` — regex-parses `{"gate":"quota"|"spend"}` from the transport error body. |
| `use-persist-session.ts` | Writes active-session messages to the store on finish. |
| `use-refresh-after-tools.ts` | Invalidates related React Query caches (roadmaps/timetables/userBids/courses) after tool calls finish. |
| `use-widget-position.ts` / `widget-geometry.ts` / `use-viewport.ts` / `typing-indicator.tsx` | Widget drag/resize/clamp, viewport tracking, typing indicator. |

### Server (`src/server/assistant/`)

| File | Purpose |
|---|---|
| `canned.ts` | Canned answers for static capability-style prompts, short-circuited **before** the quota reserve. |
| `tools.ts` | `buildAssistantTools(ctx)` — converts the shared MCP `allTools` into an AI SDK `ToolSet`. |
| `providers.ts` | `getModel()` — single OpenAI-compatible provider configured from `LLM_API_KEY`/`LLM_BASE_URL`/`LLM_MODEL`. |
| `trim.ts` | `trimToBudget(messages)` — prunes reasoning/tool-call bloat, then drops oldest messages until under max input tokens. |
| `quota.ts` | `reserveMessage`, `settleUsage`, `checkSpendGuard` — monthly quota and spend tracking. |
| `ratelimit.ts` | `checkAndIncrement` — fixed-window rate limiter per user. |
| `month.ts` | `currentMonthPeriod()` — `"YYYY-MM"` in Asia/Singapore time. |
| `status.ts` | `getAssistantStatus(userId, supabaseAccessToken?)` — aggregates quota, spend, and Supabase grant data (`hasConnectedAgent`). |

### Routes

| File | Purpose |
|---|---|
| `src/app/api/chat/route.ts` | Chat POST endpoint: canned short-circuit, auth, gates, tool catalog, streaming response, usage tracking. |
| `src/app/api/assistant/status/route.ts` | Status GET endpoint: `{signedIn, quota, used, remaining, spendPaused, hasConnectedAgent, nudgeAt}`. |

## Configuration

All limits are driven by the `chat` section of the Edge Config. The hardcoded defaults live in `src/server/ecfg/config.ts` as `DEFAULT_CHAT_CONFIG`.

### Config Keys

| Key | Type | Default | Description |
|---|---|---|---|
| `quotaPerMonth` | int | 50 | Max messages per user per calendar month |
| `nudgeAt` | int | 40 | When remaining messages drop below this, the nudge intensifies ("Heads up — N messages left") |
| `rateLimitPerMinute` | int | 10 | Max chat POSTs per user per minute (fixed window) |
| `mcpRateLimitPerMinute` | int | 60 | Max MCP tool calls per minute (reserved for future MCP endpoint) |
| `spendCapPerMonthUsd` | float | 20 | Global monthly USD spend cap (kill-switch; prevents runaway charges) |
| `maxInputTokens` | int | 16000 | Max input tokens per request (older messages are dropped to fit) |
| `maxOutputTokens` | int | 1024 | Max output tokens per response |
| `maxToolRounds` | int | 6 | Max sequential tool-call rounds per message. Kept at 6 to stay within the Vercel 60s function limit (initial call + up to 6 tool rounds). |
| `priceInputPerM` | float | 0.14 | Price per million input tokens (USD, used for spend tracking) |
| `priceOutputPerM` | float | 0.28 | Price per million output tokens (USD, used for spend tracking) |


### Changing Config

1. Edit the `chat` section in `src/server/ecfg/config.json`.
2. Run `bun run ecfg:update` — this pushes the entire JSON to Vercel Edge Config.
3. The change takes effect within ~30 seconds (Edge Config propagation). No deploy needed.

The `DEFAULT_CHAT_CONFIG` in `src/server/ecfg/config.ts` is the **hardcoded fallback** — used when the Edge Config is unreachable (e.g., in local dev without a Vercel token) or when the `chat` key is absent from the remote config. If you want new defaults to apply everywhere, update both `config.json` and `DEFAULT_CHAT_CONFIG`.

## Usage Reset (SGT Month, Lazy)

Quota and spend reset automatically at the start of each calendar month in **Asia/Singapore time** (UTC+8). There is no cron job.

- `currentMonthPeriod()` returns a period key like `"2026-08"` computed from the current SGT date.
- `checkQuota(userId)` looks up `ChatUsage` by `(userId, period)`. If no row exists for the current period, `messageCount` defaults to 0 — effectively a fresh quota.
- `reserveMessage(userId)` atomically checks and reserves a message slot **before** streaming begins. It runs inside an interactive transaction: it reads the current `messageCount`, and if under quota, upserts the `ChatUsage` row with `messageCount` incremented by 1. This means the slot is always consumed, even if the client disconnects mid-stream — closing the previous TOCTOU bypass where `onEnd` (which fires after the stream completes) was the only place usage was recorded.
- `settleUsage(userId, tokens)` records token counts and USD spend in `onEnd` after the streaming response completes. It runs in a single interactive transaction that also enforces the spend cap: if global monthly spend has already reached `spendCapPerMonthUsd`, no further ChatSpend is recorded (the kill-switch stays tripped). Token/spend settlement is best-effort on disconnect — this is an accepted trade-off since the pre-reserved message slot already closes the primary quota-abuse vector.
- `checkSpendGuard()` checks `ChatSpend.totalSpendUsd` for the current period. If the row doesn't exist yet, spend is 0 — the gate is open.

### Database Schema

```
ChatUsage(userId, period) — per-user monthly stats
  messageCount: Int   — number of chat messages this month
  tokenCount:   Int   — total tokens consumed
  spendUsd:     Float — estimated USD cost

ChatSpend(period) — global monthly spend
  totalSpendUsd: Float — aggregate across all users

RateLimit(key) — fixed-window rate limiter
  key:         String — "chat:{userId}:{windowStart}" or "mcp:{userId}:{windowStart}"
  windowStart: BigInt — epoch ms of the current window
  count:       Int    — requests in this window
```

## Gate Flow

| Condition | HTTP Status | Response Body | UI |
|---|---|---|---|
| Not signed in | 401 | `"Unauthorized"` | `SignedOutPanel` (login CTA) |
| Rate limit exceeded | 429 | `"Rate limit exceeded"` | Error surfaced by `onError` |
| Spend cap hit | 403 | `{"gate":"spend"}` | `ConnectGate reason="spend"` |
| Quota exhausted | 403 | `{"gate":"quota"}` | `ConnectGate reason="quota"` |

When the spend gate or quota gate trips, `AssistantProvider` renders `ConnectGate`, which shows a message and links to **`/settings/agents/connect`** — the OAuth agent-connection page. Users who connect their own AI agent (Claude, ChatGPT, or Gemini) bypass all gates and use their own credits.

## Environment

- **`LLM_API_KEY`** — LLM API key, set server-side in `.env` (never exposed to the client).
- **`LLM_BASE_URL`** — (optional) overrides the default OpenAI-compatible base URL (defaults to `https://api.deepseek.com`).
- **`LLM_MODEL`** — (optional) overrides the default model (defaults to `deepseek-v4-flash`).
- **`CHAT_RATE_LIMIT_PER_MINUTE`** — (optional) overrides `chat.rateLimitPerMinute` (default 10).
- **`CHAT_MCP_RATE_LIMIT_PER_MINUTE`** — (optional) overrides `chat.mcpRateLimitPerMinute` (default 60).
- **`CHAT_WRITE_RATE_LIMIT_PER_MINUTE`** — (optional) overrides the chat write-tool limit (defaults to `CHAT_RATE_LIMIT_PER_MINUTE`).
- **`CHAT_RATE_LIMIT_WINDOW_MINUTES`** — (optional) fixed-window size in minutes (default 1).
- **`SKIP_ENV_VALIDATION=1`** — set this when running `bun run lint` to bypass `src/env.ts` validation (`next lint` forces `NODE_ENV=production`, which makes the real production-required vars — `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` — required; run lint with `SKIP_ENV_VALIDATION=true` and unset it afterwards).

The LLM provider is a single OpenAI-compatible backend configured from `LLM_API_KEY`/`LLM_BASE_URL`/`LLM_MODEL` (see `src/server/assistant/providers.ts`). Rate limits can be overridden via `CHAT_*` env vars (see `src/server/ecfg/chat.ts`).

## Smoke Testing (Local Dev)

1. Start the dev server: `bun run dev` (StrictMode is on — double-render is expected and harmless).
2. Verify the status route compiles: `curl http://localhost:3000/api/assistant/status` → should return `{"signedIn":false}` (no session) or the full status JSON if you have a session cookie.
3. Verify the widget module tree compiles: open the site in a browser. The root layout should load without runtime import errors.
4. To test a full interactive chat with tools, you need:
   - A **real `LLM_API_KEY`** in `.env` (the placeholder will fail).
   - A **signed-in browser session** (Google OAuth).
   - A running dev server with the database seeded.
5. To simulate the quota gate: temporarily set `chat.quotaPerMonth` to `1` in `config.json`, run `bun run ecfg:update`, then send a second message — the widget should show the ConnectGate.

## Testing

```bash
# Full test suite (requires .env loaded into shell — see DEVELOPMENT.md)
bunx vitest run

# Type check
bunx tsc --noEmit

# Lint (skip env validation to avoid production-only env requirements)
SKIP_ENV_VALIDATION=1 bun run lint
```

Assistant-specific tests are in:
- `src/modules/assistant/*.test.ts` (chat-store-logic, gate, quota-alert, suggestions, tool-part, widget-geometry, quota-meter/logic, welcome-bubble/logic)
- `src/server/assistant/*.test.ts` (month, quota, ratelimit, tools, trim, status)

import { after } from "next/server";
import {
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";

import { auth } from "@/server/auth";
import { createCallerForUser } from "@/server/mcp/caller";
import { buildAssistantTools } from "@/server/assistant/tools";
import { trimToBudget } from "@/server/assistant/trim";
import {
  buildPageContextSuffix,
  pageContextSchema,
} from "@/server/assistant/page-context";
import { cannedResponse, findCannedAnswer } from "@/server/assistant/canned";
import { isInScope, SCOPE_REFUSAL } from "@/server/assistant/scope-gate";
import {
  reserveMessage,
  settleUsage,
  refundMessage,
  checkSpendGuard,
  checkUserSpendCap,
  beginTurn,
  endTurn,
} from "@/server/assistant/quota";
import { checkAndIncrement } from "@/server/assistant/ratelimit";
import {
  getChatConfigAsync as getCanonicalChatConfig,
  getChatWriteRateLimit as getCanonicalChatWriteRateLimit,
  getRateLimitWindowMinutes as getCanonicalRateLimitWindowMinutes,
} from "@/server/config/chat-config";
import { getModel } from "@/server/assistant/providers";
import { isLlmConfigured } from "@/server/assistant/llm-status";
import { env } from "@/env";
import { extractCachedInputTokens } from "@/server/assistant/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Multi-step chains (12 rounds) need more than 60s. Pinned to the canonical
// `chatMaxDurationSec` (300, Vercel Pro ceiling without Fluid — the Hobby-60
// cap does NOT apply to our Pro plan; Task 9). Next.js requires a LITERAL
// here (it extracts maxDuration by static analysis, so
// `getChatConfig().chatMaxDurationSec` would silently deploy as undefined);
// keep this in sync with `src/server/config/chat-config.ts` (there is a
// source comment there pointing back here).
export const maxDuration = 300;

// Input caps (Task 10): a pasted/attack payload is refused BEFORE quota,
// rate-limit, or LLM state is touched. 200 turns matches the widest legit
// multi-turn session; 512KB matches the largest tool-result replay.
const MAX_CHAT_MESSAGES = 200;
const MAX_CHAT_BODY_BYTES = 512_000;

// Input-token count above which a settlement HARD-BLOCKS the turn's spend
// recording (usually a huge tool result re-sent across loop steps or a broken
// cached prefix). Canonical value lives in `src/server/config/chat-config.ts`
// (`settlementSpikeTokens` = 30000); this fraction is the sync-mirror of the
// derivation (0.5 × maxInputTokens 64000 ≈ 32000 → pinned 30000 per brief):
// derive per-turn from the live config so an env override moves the
// threshold with the budget, and clamp to the canonical floor.
const SETTLEMENT_SPIKE_FRACTION = 0.5;

// CACHE-CRITICAL: this prompt + the tool catalog are the shared account-wide
// cached prefix for the LLM provider. Any byte change (wording, tool order,
// tool schemas/descriptions) invalidates the cache for EVERY user at once.
// Change only deliberately, and never per-request/per-user.
// The identity/capability/scope/never-invent invariants below mirror the
// canonical source `src/server/assistant/rules.ts` (ASSISTANT_RULES) by
// duplication: importing it here would change these bytes (join shape), so
// keep the text in sync manually and let the verbatim tests pin both sides.
const SYSTEM_PROMPT = [
  "You are the afterclass.io assistant, helping SMU students plan their studies.",
  "You can search courses and professors, manage the user's timetables, bids, and roadmaps, and recommend bid amounts.",
  "Rules:",
  "- Only use tools that exist. Confirm with the user before creating or deleting anything.",
  "- Reviews are read-only: never write, edit, or fabricate reviews.",
  "- You can only see the user's own private data and public data; never claim to see others' private data.",
  "- Keep answers concise and cite what you actually looked up.",
  "Prompt steering:",
  "- If a request is vague, generic, or could match many things (e.g. 'reviews', 'courses starting with a', 'professor starting with a', 'how many professors'), do NOT fire a broad search. Ask ONE short clarifying question instead — which course code/name, which professor, which academic term, or what exactly.",
  "- If a question is outside afterclass.io's data (general knowledge, exact counts we don't track, other schools), say so directly and offer the closest thing you CAN do. Never guess or invent numbers.",
  "- Search is typo-tolerant but imperfect. If a search returns nothing or nonsense, retry with a corrected/simpler query (fix typos, drop filler words) and state the assumption you made.",
  "- Academic-term and bid-window inputs default to the current term/window server-side. Do NOT invent a term id; prefer omitting it, or get it from list-acad-terms.",
  "- Reviews: when the user names a course, resolve its exact code first (search-courses/get-course), then call get-course-reviews — never present search results as the review answer.",
  "- Section-specific bid questions ('how much for COR-IS1702 G1?', 'for G1?') go to explore-bid-options with courseCode+section (interactive chart/slider), not bid-estimate.",
  "- Scope: you help with SMU courses, bids, timetables, roadmaps, and reviews only. For anything else, refuse politely in one sentence and offer the closest in-scope help. Never write code or do coursework.",
  "After any bid/budget change, the tool result already contains the full updated bid plan — summarize budget + each bid (course/section/professor/amount/status/round/window). Do not call my-bid-plan again for the same term.",
  "After creating/copying/editing a roadmap, the tool result contains the updated roadmap — summarize its name, term grid, and key courses.",
  "Multi-step planning:",
  "- Before calling any tool, plan the full chain: what data you need and the order to fetch it. Prefer the fewest, most specific tools; if one tool returns everything you need, do not over-split.",
  "- Run searches before proposing courses, professors, or plans. Never invent course codes, section numbers, professor names, review content, or bid prices - only use values returned by tools.",
  '- State your assumptions explicitly (e.g. "assuming \'night classes\' means starting at or after 18:00" or "assuming you mean your active roadmap").',
  "- For math, sums, or optimisation (budgets, bid allocation, exam-clash overlap), use the dedicated tools (recommend-bid-amount, bid-estimate, check-roadmap-feasibility) instead of computing in your head.",
  "- After a write (upsert-bid, save-bids, save-roadmap-entries, add/remove class), verify by re-reading (my-bid-plan, get-my-roadmap, get-my-timetable-detail) and confirm what changed.",
  '- If you hit the "making changes too quickly" message, stop and consolidate remaining writes into fewer tool calls, then retry.',
  "- Ask at most one clarifying question, and only when the request is genuinely ambiguous (which term, which timetable, which roadmap). Otherwise proceed with the active/default and say what you assumed.",
  "- Keep answers concise; cite the tools you used and the course codes / section numbers you looked up.",
  "- Deep-links: when a tool result contains a page link (e.g. 'Open in bid analytics: /bidding/analytics?...'), render it as a markdown link with a short label ('Open in bid analytics') after your 1-2 sentence summary. Link to the page instead of pasting raw data or dumping the full result — the page is the action surface. Never invent page URLs; only render links the tools returned.",
].join("\n");

const GATE = (reason: "quota" | "spend") =>
  Response.json({ gate: reason }, { status: 403 });

/**
 * Wraps the raw streamText stream so a failed turn refunds the reserved quota
 * slot. The AI SDK surfaces mid-stream model failures as a `{ type: "error" }`
 * part and cancels the stream when the client disconnects. `onEnd`
 * (settlement) only runs when at least one step completed without a
 * NoOutputGeneratedError (`eventProcessor.flush`), so on an error part it may
 * or may not fire depending on how much of the turn succeeded:
 *  - Error with completed steps -> the SDK settles the partial usage via onEnd
 *    and the slot is KEPT; the refund must yield to settlement.
 *  - Error with no completed steps -> no settlement; the reserved slot is
 *    rolled back.
 * The shared `quotaSettled` flag makes settle + refund mutually exclusive no
 * matter how the SDK sequences flush vs. the error part: whichever claims the
 * turn first wins, and the other becomes a no-op. The error-part refund is
 * deferred until the stream closes so onEnd (which runs before close) can
 * claim first and record partial spend; cancel/read errors refund immediately.
 */
function guardAgainstFailedStream<T>(
  stream: ReadableStream<T>,
  onFailure: () => Promise<void>,
  quotaSettled: { value: boolean },
  onRelease?: () => void,
): ReadableStream<T> {
  let failed = false;
  const refund = () => {
    if (quotaSettled.value) return; // onEnd already settled - the slot is kept
    quotaSettled.value = true; // claim the turn; onEnd can never settle after a refund
    try {
      onRelease?.();
    } finally {
      void onFailure().catch(() => {
        // best-effort: a refund DB error must never break the response stream
      });
    }
  };
  const reader = stream.getReader();
  return new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          // The SDK's eventProcessor.flush has completed by the time the
          // stream closes: if it settled (onEnd) the slot is kept; otherwise a
          // mid-stream error means the reserved slot is refunded.
          if (failed && !quotaSettled.value) refund();
          controller.close();
          return;
        }
        if (
          !failed &&
          value &&
          typeof value === "object" &&
          "type" in value &&
          (value as { type?: string }).type === "error"
        ) {
          // Defer the refund to close: a mid-stream error may be followed by
          // onEnd settlement (partial usage from completed steps). Settlement
          // takes priority so partial spend is still recorded and the slot is
          // kept for a turn that produced content.
          failed = true;
        }
        controller.enqueue(value);
      } catch (error) {
        refund();
        controller.error(error);
      }
    },
    cancel() {
      // Client disconnected (abort): do NOT refund. The reserved slot stays consumed
      // so reading the answer then aborting cannot yield a free message or unrecorded
      // spend. Settlement (onEnd) will still account token usage best-effort; if the
      // stream is torn down before it can fire, the slot remains consumed - intentional.
      if (!quotaSettled.value) quotaSettled.value = true;
      onRelease?.();
      void reader.cancel().catch(() => {
        // best-effort: propagate the downstream cancel to the source
      });
    },
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  // Degraded mode: without an LLM key the app still boots and serves
  // browsing — only chat turns are refused, before any quota/rate-limit state.
  if (!isLlmConfigured(env)) return new Response("Assistant unavailable", { status: 503 });
  const userId = session.user.id;

  // Validate the body BEFORE any gates so a malformed request can never burn
  // a quota slot (reserveMessage writes a row) or hit the rate limiter.
  // Caps (Task 10): at most MAX_CHAT_MESSAGES turns and MAX_CHAT_BODY_BYTES
  // of body per request — a pasted/attack payload is refused before quota,
  // rate-limit, or LLM state is touched.
  let messages: UIMessage[];
  let contextSuffix = "";
  try {
    const rawLen = Number(req.headers.get("content-length") ?? "0");
    if (rawLen > MAX_CHAT_BODY_BYTES)
      return new Response("Request too large", { status: 413 });
    const body = (await req.json()) as {
      messages?: unknown;
      pageContext?: unknown;
    };
    if (
      !Array.isArray(body.messages) ||
      body.messages.length === 0 ||
      body.messages.length > MAX_CHAT_MESSAGES
    )
      return new Response("Invalid request body", { status: 400 });
    messages = body.messages as UIMessage[];
    // pageContext is untrusted client input: safeParse + ignore-on-failure.
    // Never 400 a chat turn for bad context; the turn proceeds context-free.
    // It also never auto-authorizes writes — the confirm:true gate in
    // src/server/assistant/tools.ts is unchanged.
    if (body.pageContext !== undefined) {
      const parsed = pageContextSchema.safeParse(body.pageContext);
      if (parsed.success) contextSuffix = buildPageContextSuffix(parsed.data);
    }
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  // Canned answers short-circuit BEFORE quota reservation/rate limiting, so
  // static capability questions cost the user nothing.
  const canned = findCannedAnswer(messages);
  if (canned) return cannedResponse(canned);

  // Scope gate: cheap static refusal BEFORE the rate limiter and quota
  // reservation, so off-topic turns ("reverse a linked list") burn neither a
  // quota slot nor an LLM call. Fail-open: when no user text can be
  // extracted (or it is only whitespace), the turn falls through to the
  // normal gates and the model's own scope rule.
  {
    const last = messages.at(-1);
    if (last?.role === "user") {
      const parts = Array.isArray(last.parts) ? last.parts : [];
      const text = parts
        .filter((p) => p.type === "text")
        .map((p) => ("text" in p ? p.text : ""))
        .join(" ");
      if (text.trim().length > 0 && !isInScope(text))
        return cannedResponse(SCOPE_REFUSAL);
    }
  }

  const chat = await getCanonicalChatConfig();
  const windowMinutes = getCanonicalRateLimitWindowMinutes();
  // Per-user spend cap (Task 7): checked alongside the global kill-switch,
  // before any quota is reserved. Both hard-block (403 spend gate).
  const [spendOk, userSpend, rate] = await Promise.all([
    checkSpendGuard(),
    checkUserSpendCap(userId),
    checkAndIncrement(`chat:${userId}`, chat.rateLimitPerMinute, windowMinutes),
  ]);
  if (!rate.ok) return new Response("Rate limit exceeded", { status: 429 });
  if (!spendOk || !userSpend.ok) return GATE("spend");
  // In-flight guard: a second concurrent turn for the same user is rejected
  // (429) so two expensive turns cannot both pass the cap check and then
  // both settle past it. Best-effort (single-instance); the atomic DB settle
  // remains the hard backstop.
  if (!beginTurn(userId))
    return new Response("A previous turn is still running", { status: 429 });

  // Everything below reserves a quota slot, so any failure must refund it.
  // `reserved` tracks whether the slot was taken; the stream itself is also
  // guarded so a mid-stream error or a client disconnect rolls the slot back.
  let reserved = false;
  try {
    const reservedResult = await reserveMessage(userId);
    if (!reservedResult.ok) {
      // Release the in-flight slot: quota rejection must not convert into
      // spurious 429s until the stale-slot expiry (every other post-beginTurn
      // path releases too).
      endTurn(userId);
      return GATE("quota");
    }
    reserved = true;

    const ctx = createCallerForUser(session.user);
    const tools = buildAssistantTools(
      ctx,
      getCanonicalChatWriteRateLimit(chat),
      windowMinutes,
    );
    const modelMessages = await trimToBudget(messages);

    // Shared quota decision for this turn: onEnd (settlement) and the stream
    // guard's refund are mutually exclusive - whichever claims the turn first
    // wins and the other becomes a no-op (see guardAgainstFailedStream). This
    // holds regardless of how the SDK sequences flush vs. the error part.
    const quotaSettled = { value: false };

    const result = streamText({
      model: await getModel(),
      instructions: SYSTEM_PROMPT + contextSuffix,
      messages: modelMessages,
      tools,
      stopWhen: isStepCount(chat.maxToolRounds),
      maxOutputTokens: chat.maxOutputTokens,
      // Structured per-step usage log (Task 11): one JSON line per agent-loop
      // step so cost/abuse regressions are visible in the server log pipeline
      // without turning on the CHAT_LOG_USAGE=1 raw-usage probe below. Never
      // throws — observability must not break the turn.
      onStepFinish: async ({ usage }) => {
        try {
          // intentional: per-step structured usage signal, keep loud
          console.log(
            "[assistant:step-usage]",
            JSON.stringify({
              userId,
              inputTokens: usage.inputTokens ?? 0,
              outputTokens: usage.outputTokens ?? 0,
              cachedInputTokens: extractCachedInputTokens(usage),
            }),
          );
        } catch {
          // Never break the turn for a logging failure.
        }
      },
      // Stop paying output tokens when the client disconnects (Stop button /
      // navigation). Does NOT change quota semantics: the reserved slot stays
      // consumed on abort (see guardAgainstFailedStream.cancel).
      abortSignal: req.signal,
      // NOTE: The message slot was pre-reserved by reserveMessage(), so quota
      // cannot be bypassed by disconnecting. Token/spend settlement is
      // scheduled via after() in onEnd (Vercel waitUntil semantics: the
      // function keeps running after the response closes); where after() is
      // unavailable it runs inline. The remaining best-effort case (crash
      // before the promise settles) is accepted: the spend cap is already
      // enforced atomically in settleUsage and the primary abuse vector
      // (free messages) is closed.
      // On failure, guardAgainstFailedStream below refunds the reserved slot.
      onEnd: async ({ usage }) => {
        if (quotaSettled.value) return; // already refunded - never settle after a refund
        quotaSettled.value = true; // claim the turn for settlement
        const settle = async () => {
          try {
            // Cache reads: normalised field first, then the provider's raw
            // prompt_cache_hit_tokens (see usage.ts - the SDK does not map it).
            const cachedInput = extractCachedInputTokens(usage);
            // One-time diagnostic: CHAT_LOG_USAGE=1 logs the raw usage payload so the
            // provider field mapping can be re-verified after provider/SDK upgrades.
            // Allowlisted raw read (diagnostic flag only — not config; the ban
            // covers config reads outside env.ts/env-gate.ts/chat-config.ts).
            if (process.env.CHAT_LOG_USAGE === "1") {
              // intentional: one-time opt-in diagnostic for provider field mapping
              console.log("[assistant:usage]", JSON.stringify(usage));
            }
            const spikeThreshold = Math.floor(
              Math.min(
                chat.maxInputTokens * SETTLEMENT_SPIKE_FRACTION,
                chat.settlementSpikeTokens,
              ),
            );
            if ((usage.inputTokens ?? 0) > spikeThreshold) {
              // Settlement spike: usually a huge tool result re-sent across loop
              // steps or a broken cached prefix. HARD-BLOCK: skip settleUsage so
              // a runaway turn cannot record unbounded spend (the message slot
              // stays consumed — the turn happened — but the token/spend write
              // is dropped). Loud enough to catch cost regressions.
              // intentional: cost-regression signal, keep loud
              console.warn(
                `[assistant] settlement spike blocked: input=${usage.inputTokens} cached=${cachedInput} threshold=${spikeThreshold}`,
              );
              return;
            }
            await settleUsage(userId, {
              input: usage.inputTokens ?? 0,
              output: usage.outputTokens ?? 0,
              cachedInput,
            });
          } catch (error) {
            // Settlement must never fail silently: onEnd runs post-response
            // (inside after()), so an unhandled rejection is invisible to the
            // client — record it loudly.
            // intentional: settlement-failure signal, keep loud
            console.error("[assistant] settleUsage failed:", error);
          } finally {
            endTurn(userId);
          }
        };
        // after() (Vercel waitUntil semantics) keeps this settlement alive
        // past client disconnect — MUST be called synchronously in the
        // request scope. Falls back to inline execution where after() is
        // unavailable (tests, non-Vercel runtimes). A crash before the work
        // settles stays best-effort (accepted: the spend cap is enforced
        // atomically in settleUsage and free messages are closed by the
        // pre-reserved slot).
        try {
          after(settle);
        } catch {
          void settle();
        }
      },
    });

    // Refund the reserved slot when the stream errors or is aborted before it
    // can settle (onEnd). Successful/partial streams still settle via onEnd.
    // endTurn releases the in-flight slot on refund AND on abort-cancel.
    const guarded = guardAgainstFailedStream(
      result.stream,
      () => refundMessage(userId),
      quotaSettled,
      () => endTurn(userId),
    );

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: guarded }),
    });
  } catch (error) {
    // Synchronous failure after reservation (e.g. model/config error) - the
    // client sees a 500 and the reserved slot is rolled back so the failed
    // send never burns quota. The in-flight turn is always released.
    endTurn(userId);
    if (reserved) {
      await refundMessage(userId).catch(() => {
        // best-effort refund
      });
    }
    // intentional: server-side failure signal for the pre-stream catch path
    console.error("[assistant] chat request failed before streaming:", error);
    return new Response("Assistant unavailable", { status: 500 });
  }
}

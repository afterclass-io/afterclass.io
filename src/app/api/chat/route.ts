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
import { cannedResponse, findCannedAnswer } from "@/server/assistant/canned";
import { reserveMessage, settleUsage, refundMessage, checkSpendGuard } from "@/server/assistant/quota";
import { checkAndIncrement } from "@/server/assistant/ratelimit";
import { getChatConfig, getChatWriteRateLimit, getRateLimitWindowMinutes } from "@/server/ecfg/chat";
import { getModel } from "@/server/assistant/providers";
import { extractCachedInputTokens } from "@/server/assistant/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Multi-step chains (12 rounds) need more than 60s. 300 is the Vercel Node.js ceiling — VERIFY against the actual deploy plan before going live (Hobby non-Fluid caps at 60); flagged human-pending.
export const maxDuration = 300;

// CACHE-CRITICAL: this prompt + the tool catalog are the shared account-wide
// cached prefix for the LLM provider. Any byte change (wording, tool order,
// tool schemas/descriptions) invalidates the cache for EVERY user at once.
// Change only deliberately, and never per-request/per-user.
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
  "- Scope: you help with SMU courses, bids, timetables, roadmaps, and reviews only. For anything else, refuse politely in one sentence and offer the closest in-scope help. Never write code or do coursework.",
  "After any bid/budget change, the tool result already contains the full updated bid plan — summarize budget + each bid (course/section/professor/amount/status/round/window). Do not call my-bid-plan again for the same term.",
  "After creating/copying/editing a roadmap, the tool result contains the updated roadmap — summarize its name, term grid, and key courses.",
  "Multi-step planning:",
  "- Before calling any tool, plan the full chain: what data you need and the order to fetch it. Prefer the fewest, most specific tools; if one tool returns everything you need, do not over-split.",
  "- Run searches before proposing courses, professors, or plans. Never invent course codes, section numbers, professor names, review content, or bid prices - only use values returned by tools.",
  "- State your assumptions explicitly (e.g. \"assuming 'night classes' means starting at or after 18:00\" or \"assuming you mean your active roadmap\").",
  "- For math, sums, or optimisation (budgets, bid allocation, exam-clash overlap), use the dedicated tools (recommend-bid-amount, bid-estimate, optimize-bid-allocation, check-roadmap-feasibility) instead of computing in your head.",
  "- After a write (upsert-bid, save-bids, save-roadmap-entries, add/remove class), verify by re-reading (my-bid-plan, get-my-roadmap, get-my-timetable-detail) and confirm what changed.",
  "- If you hit the \"making changes too quickly\" message, stop and consolidate remaining writes into fewer tool calls, then retry.",
  "- Ask at most one clarifying question, and only when the request is genuinely ambiguous (which term, which timetable, which roadmap). Otherwise proceed with the active/default and say what you assumed.",
  "- Keep answers concise; cite the tools you used and the course codes / section numbers you looked up.",
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
): ReadableStream<T> {
  let failed = false;
  const refund = () => {
    if (quotaSettled.value) return; // onEnd already settled - the slot is kept
    quotaSettled.value = true; // claim the turn; onEnd can never settle after a refund
    void onFailure().catch(() => {
      // best-effort: a refund DB error must never break the response stream
    });
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
      void reader.cancel().catch(() => {
        // best-effort: propagate the downstream cancel to the source
      });
    },
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const userId = session.user.id;

  // Validate the body BEFORE any gates so a malformed request can never burn
  // a quota slot (reserveMessage writes a row) or hit the rate limiter.
  let messages: UIMessage[];
  try {
    const body = (await req.json()) as { messages?: unknown };
    if (!Array.isArray(body.messages)) return new Response("Invalid request body", { status: 400 });
    messages = body.messages as UIMessage[];
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  // Canned answers short-circuit BEFORE quota reservation/rate limiting, so
  // static capability questions cost the user nothing.
  const canned = findCannedAnswer(messages);
  if (canned) return cannedResponse(canned);

  const chat = await getChatConfig();
  const windowMinutes = getRateLimitWindowMinutes();
  const [spendOk, rate] = await Promise.all([
    checkSpendGuard(),
    checkAndIncrement(`chat:${userId}`, chat.rateLimitPerMinute, windowMinutes),
  ]);
  if (!rate.ok) return new Response("Rate limit exceeded", { status: 429 });
  if (!spendOk) return GATE("spend");

  // Everything below reserves a quota slot, so any failure must refund it.
  // `reserved` tracks whether the slot was taken; the stream itself is also
  // guarded so a mid-stream error or a client disconnect rolls the slot back.
  let reserved = false;
  try {
    const reservedResult = await reserveMessage(userId);
    if (!reservedResult.ok) return GATE("quota");
    reserved = true;

    const ctx = createCallerForUser(session.user);
    const tools = buildAssistantTools(ctx, getChatWriteRateLimit(chat), windowMinutes);
    const modelMessages = await trimToBudget(messages);

    // Shared quota decision for this turn: onEnd (settlement) and the stream
    // guard's refund are mutually exclusive - whichever claims the turn first
    // wins and the other becomes a no-op (see guardAgainstFailedStream). This
    // holds regardless of how the SDK sequences flush vs. the error part.
    const quotaSettled = { value: false };

    const result = streamText({
      model: await getModel(),
      instructions: SYSTEM_PROMPT,
      messages: modelMessages,
      tools,
      stopWhen: isStepCount(chat.maxToolRounds),
      maxOutputTokens: chat.maxOutputTokens,
      // Stop paying output tokens when the client disconnects (Stop button /
      // navigation). Does NOT change quota semantics: the reserved slot stays
      // consumed on abort (see guardAgainstFailedStream.cancel).
      abortSignal: req.signal,
      // NOTE: The message slot was pre-reserved by reserveMessage(), so quota
      // cannot be bypassed by disconnecting. Token/spend settlement remains
      // best-effort on disconnect (onEnd may not fire) - this is a documented,
      // accepted trade-off since the spend cap is already enforced atomically
      // in settleUsage and the primary abuse vector (free messages) is closed.
      // On failure, guardAgainstFailedStream below refunds the reserved slot.
      onEnd: async ({ usage }) => {
        if (quotaSettled.value) return; // already refunded - never settle after a refund
        quotaSettled.value = true; // claim the turn for settlement
        // Cache reads: normalised field first, then the provider's raw
        // prompt_cache_hit_tokens (see usage.ts - the SDK does not map it).
        const cachedInput = extractCachedInputTokens(usage);
        // One-time diagnostic: CHAT_LOG_USAGE=1 logs the raw usage payload so the
        // provider field mapping can be re-verified after provider/SDK upgrades.
        if (process.env.CHAT_LOG_USAGE === "1") {
          console.log("[assistant:usage]", JSON.stringify(usage));
        }
        if ((usage.inputTokens ?? 0) > 30_000) {
          // Settlement spike: usually a huge tool result re-sent across loop steps
          // or a broken cached prefix. Loud enough to catch cost regressions.
          console.warn(
            `[assistant] large settlement: input=${usage.inputTokens} cached=${cachedInput}`,
          );
        }
        await settleUsage(userId, {
          input: usage.inputTokens ?? 0,
          output: usage.outputTokens ?? 0,
          cachedInput,
        });
      },
    });

    // Refund the reserved slot when the stream errors or is aborted before it
    // can settle (onEnd). Successful/partial streams still settle via onEnd.
    const guarded = guardAgainstFailedStream(result.stream, () => refundMessage(userId), quotaSettled);

    return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: guarded }) });
  } catch (error) {
    // Synchronous failure after reservation (e.g. model/config error) - the
    // client sees a 500 and the reserved slot is rolled back so the failed
    // send never burns quota.
    if (reserved) {
      await refundMessage(userId).catch(() => {
        // best-effort refund
      });
    }
    console.error("[assistant] chat request failed before streaming:", error);
    return new Response("Assistant unavailable", { status: 500 });
  }
}

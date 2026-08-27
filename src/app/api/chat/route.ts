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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_PROMPT = [
  "You are the afterclass.io assistant, helping SMU students plan their studies.",
  "You can search courses and professors, manage the user's timetables, bids, and roadmaps, and recommend bid amounts.",
  "Rules:",
  "- Only use tools that exist. Confirm with the user before creating or deleting anything.",
  "- Reviews are read-only: never write, edit, or fabricate reviews.",
  "- You can only see the user's own private data and public data; never claim to see others' private data.",
  "- Keep answers concise and cite what you actually looked up.",
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
    if (quotaSettled.value) return; // onEnd already settled — the slot is kept
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
      // stream is torn down before it can fire, the slot remains consumed — intentional.
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
    // guard's refund are mutually exclusive — whichever claims the turn first
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
      // NOTE: The message slot was pre-reserved by reserveMessage(), so quota
      // cannot be bypassed by disconnecting. Token/spend settlement remains
      // best-effort on disconnect (onEnd may not fire) — this is a documented,
      // accepted trade-off since the spend cap is already enforced atomically
      // in settleUsage and the primary abuse vector (free messages) is closed.
      // On failure, guardAgainstFailedStream below refunds the reserved slot.
      onEnd: async ({ usage }) => {
        if (quotaSettled.value) return; // already refunded — never settle after a refund
        quotaSettled.value = true; // claim the turn for settlement
        // AI SDK v5: cached input tokens are in usage.inputTokenDetails.cacheReadTokens
        // (provider cache-hit, e.g. prompt caching). Falls back to 0 if unavailable.
        const cachedInput = usage.inputTokenDetails?.cacheReadTokens ?? 0;
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
    // Synchronous failure after reservation (e.g. model/config error) — the
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

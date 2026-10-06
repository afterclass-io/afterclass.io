import { ModerationVerdict } from "@/generated/prisma/enums";
import { checkAndIncrement } from "@/server/assistant/ratelimit";
import { getModel } from "@/server/assistant/providers";
import {
  getChatConfigAsync,
  type ChatConfig,
} from "@/server/config/chat-config";
import { db, txDb } from "@/server/db";

import { judgeText, type JudgeInput, type JudgeResult } from "./judge";
import { MODERATION_SURFACES, type ReportSurface } from "./surfaces";
import { effectiveThreshold } from "./threshold";

export type ModerationTarget = { surface: ReportSurface; itemId: string };
export type Judge = (input: JudgeInput) => Promise<JudgeResult>;
export type ModerationRunConfig = Pick<
  ChatConfig,
  | "moderationReportThreshold"
  | "moderationBackoffMultiplier"
  | "moderationThresholdCap"
  | "moderationClaimWindowMinutes"
  | "moderationJudgementsPerHour"
>;
export type RunOutcome =
  | "below_threshold"
  | "claim_lost"
  | "ceiling_reached"
  | "item_gone"
  | "violation"
  | "cleared"
  | "error";

/**
 * Item text is user-controlled and review bodies/tips are uncapped, so the
 * judge reads at most about this many characters. Longer text is sent as its
 * head and tail (a prefix alone would let an author hide abuse behind benign
 * padding). The audit log keeps the full removed text.
 */
export const MAX_JUDGE_TEXT_CHARS = 20_000;
const JUDGE_WINDOW_CHARS = MAX_JUDGE_TEXT_CHARS / 2;
export const JUDGE_TRUNCATION_MARKER = "\n[...]\n";

function judgeWindow(text: string): string {
  if (text.length <= MAX_JUDGE_TEXT_CHARS) return text;
  return (
    text.slice(0, JUDGE_WINDOW_CHARS) +
    JUDGE_TRUNCATION_MARKER +
    text.slice(-JUDGE_WINDOW_CHARS)
  );
}

/** Global fixed-window ceiling on judgements (rate_limit row per hour). */
const JUDGE_CEILING_KEY = "moderation:judge-hourly";

/**
 * One moderation pass for one item. Order matters:
 *  1. count distinct reporters since the last clearance (a report written
 *     while a judgement is in flight predates the CLEARED row and is not
 *     counted next round — accepted, costs at most one extra reporter);
 *  2. take the claim (limit 1 per item + clearance count + claim window), so
 *     concurrent crossings judge once; a fixed-window boundary can rarely
 *     admit two (one wasted judgement, accepted);
 *  3. only claim winners spend the hourly ceiling;
 *  4. judge the LIVE text — never client-supplied text.
 */
export async function runModeration(
  target: ModerationTarget,
  cfg: ModerationRunConfig,
  judge: Judge,
): Promise<RunOutcome> {
  const adapter = MODERATION_SURFACES[target.surface];
  const { surface } = adapter;
  const { itemId } = target;

  const cleared = await db.moderationLog.aggregate({
    where: { surface, itemId, verdict: ModerationVerdict.CLEARED },
    _count: { _all: true },
    _max: { createdAt: true },
  });
  const clearances = cleared._count._all;
  const since = cleared._max.createdAt;
  const reporters = await db.moderationReport.count({
    where: {
      ...adapter.reportsFor(itemId),
      ...(since ? { createdAt: { gt: since } } : {}),
    },
  });
  if (reporters < effectiveThreshold(cfg, clearances)) return "below_threshold";

  const claim = await checkAndIncrement(
    `moderation:claim:${surface}:${itemId}:${clearances}`,
    1,
    cfg.moderationClaimWindowMinutes,
  );
  if (!claim.ok) return "claim_lost";
  const ceiling = await checkAndIncrement(
    JUDGE_CEILING_KEY,
    cfg.moderationJudgementsPerHour,
    60,
  );
  if (!ceiling.ok) return "ceiling_reached";

  const text = await adapter.readText(db, itemId);
  if (text === null) return "item_gone";

  const result = await judge({
    surfaceLabel: adapter.label,
    text: judgeWindow(text),
  });

  if (result.kind === "violation") {
    // Interactive transaction → direct client (pooled pgbouncer breaks it).
    await txDb.$transaction(async (tx) => {
      await adapter.applyViolation(tx, itemId);
      await tx.moderationLog.create({
        data: {
          surface,
          itemId,
          verdict: ModerationVerdict.VIOLATION,
          policyRule: result.policyRule,
          language: result.language,
          rationale: result.rationale,
          model: result.model,
          removedText: text,
        },
      });
    });
    return "violation";
  }
  if (result.kind === "cleared") {
    await db.moderationLog.create({
      data: {
        surface,
        itemId,
        verdict: ModerationVerdict.CLEARED,
        language: result.language,
        rationale: result.rationale,
        model: result.model,
      },
    });
    return "cleared";
  }
  await db.moderationLog.create({
    data: {
      surface,
      itemId,
      verdict: ModerationVerdict.ERROR,
      rationale: result.reason,
      model: result.model,
    },
  });
  return "error";
}

/** The production judge: the moderation-purpose model, configured timeout. */
export function createModerationJudge(timeoutMs: number): Judge {
  return async (input) => {
    let model: Awaited<ReturnType<typeof getModel>>;
    try {
      model = await getModel("moderation");
    } catch {
      // Missing key or invalid model config: nothing is removed; the ERROR
      // row is the signal for a human.
      return {
        kind: "error",
        reason: "model_unavailable",
        model: "unresolved",
      };
    }
    return judgeText(input, { model, timeoutMs });
  };
}

/** After-response entry point: one pass, failures logged once here. */
export async function runModerationTask(
  target: ModerationTarget,
): Promise<void> {
  try {
    const cfg = await getChatConfigAsync();
    await runModeration(
      target,
      cfg,
      createModerationJudge(cfg.moderationJudgeTimeoutMs),
    );
  } catch (error) {
    // intentional: runs after the response (inside after()), where an
    // unhandled rejection is invisible. Log once; the claim expires and a
    // later report retries.
    console.error("[moderation] run failed:", error);
  }
}

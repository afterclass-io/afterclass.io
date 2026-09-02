import type { RouterCaller } from "../types";

export interface BidPlanEntry {
  id: string;
  bidAmount: number;
  status: string;
  courseCode: string;
  courseName: string;
  section: string;
  professorName: string | null;
  round: string;
  window: number;
}

export interface BidPlan {
  acadTermId: string;
  budget: { balance: number } | null;
  bids: BidPlanEntry[];
}

/**
 * Build the full bid plan for one academic term. Mirrors myBidPlanTool's
 * payload: every saved bid in that term (course, section, professor, amount,
 * status, round/window) plus the budget balance. `notes` is stripped — it is
 * PII / private bidding strategy and must never reach the LLM.
 */
export async function buildBidPlan(
  caller: RouterCaller,
  acadTermId: string,
): Promise<BidPlan> {
  const [bids, budget] = await Promise.all([
    caller.userBids.listMine(),
    caller.userBids.getBudget({ acadTermId }),
  ]);
  const plan: BidPlanEntry[] = bids
    .filter((b) => b.bidWindow?.acadTermId === acadTermId)
    .map((b) => ({
      id: b.id,
      bidAmount: b.bidAmount,
      status: b.status,
      courseCode: b.courseCode,
      courseName: b.courseName,
      section: b.section,
      professorName: b.professorName ?? null,
      round: b.bidWindow.round,
      window: b.bidWindow.window,
    }));
  return {
    acadTermId,
    budget: (budget) ?? null,
    bids: plan,
  };
}

/**
 * Shared toWidgetProps for any tool whose JSON text is a BidPlan. Mirrors
 * bid-plan.ts:16-21 — parses the text back into the widget's BidPlan props.
 * Write tools emit { updated, plan } — unwrap the plan for the widget.
 */
export function bidPlanToWidgetProps(result: {
  content: Array<{ type: "text"; text: string }>;
}): Record<string, unknown> {
  const text = result.content.find((c) => c.type === "text")?.text ?? "";
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (
      parsed &&
      typeof parsed === "object" &&
      "plan" in parsed &&
      parsed.plan &&
      typeof parsed.plan === "object"
    ) {
      return parsed.plan as Record<string, unknown>;
    }
    return parsed;
  } catch {
    return { raw: text };
  }
}

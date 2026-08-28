import { z } from "zod";

import { errText, errorMessage, jsonText, type McpTool } from "../../types";

const DEFAULT_BEATS_PERCENTAGE = 70;

const recommendBidAmountSchema = z.object({
  classId: z.string().describe("Class id; obtain from get-classes"),
  beatsPercentage: z
    .number()
    .int()
    .min(1)
    .max(99)
    .default(DEFAULT_BEATS_PERCENTAGE)
    .describe("Confidence level: how many % of bids the amount should beat"),
});

export const recommendBidAmountTool: McpTool<typeof recommendBidAmountSchema> = {
  name: "recommend-bid-amount",
  description:
    "Suggest a bid amount for a class by combining the latest prediction with a safety multiplier. Read-only; never writes data.",
  inputSchema: recommendBidAmountSchema,
  readOnly: true,
  widgetName: "bid-recommendation",
  toWidgetProps: (result) => {
    // result is the JSON text emitted by `run` below; parse it back into props.
    const text = result.content.find((c) => c.type === "text")?.text ?? "";
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { raw: text };
    }
  },
  run: async ({ caller }, { classId, beatsPercentage }) => {
    try {
      const prediction = await caller.bidPredictions.getBy({ classId });
      if (!prediction?.bidWindow) {
        return errText(`No prediction available for class ${classId} yet.`);
      }
      const factors = await caller.safetyFactors.getAll();
      const factor = factors.find(
        (f) =>
          f.acadTermId === prediction.bidWindow.acadTermId &&
          f.predictionType === "MEDIAN" &&
          f.beatsPercentage === beatsPercentage,
      );
      const base = prediction.medianPredicted;
      const multiplier = factor?.multiplier ?? 1;
      const suggestedBidAmount = Math.round(base * multiplier * 100) / 100;
      return jsonText({
        classId,
        acadTermId: prediction.bidWindow.acadTermId,
        bidWindow: {
          id: prediction.bidWindow.id,
          round: prediction.bidWindow.round,
          window: prediction.bidWindow.window,
        },
        predictedMedian: base,
        suggestedBidAmount,
        multiplierUsed: factor ? { beatsPercentage, multiplier } : null,
        rationale: factor
          ? `Predicted median ${base} x safety multiplier ${multiplier} (beats ${beatsPercentage}% of bids).`
          : `No safety factor for beats ${beatsPercentage}%; suggested = predicted median ${base} x 1.0.`,
      });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

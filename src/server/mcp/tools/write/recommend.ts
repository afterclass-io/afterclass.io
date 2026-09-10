import { z } from "zod";

import {
  parseViewJson,
  errText,
  errorMessage,
  jsonText,
  type McpTool,
} from "../../types";
import {
  DEFAULT_BEATS_PERCENTAGE, // canonical defaultBeatsPct via bid-shared.ts → chat-config.ts getter
  findSafetyFactor,
  rationaleFor,
  suggestBidAmount,
} from "../bid-shared";

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

export const recommendBidAmountTool: McpTool<typeof recommendBidAmountSchema> =
  {
    name: "recommend-bid-amount",
    description:
      "Suggest a bid amount for a class by combining the latest prediction with a safety multiplier (predicted + multiplier x uncertainty). Read-only; never writes data. Suggested amounts are never below e$10.",
    inputSchema: recommendBidAmountSchema,
    readOnly: true,
    toViewProps: (result) => {
      // result is the JSON text emitted by `run` below; parse it back into props.
      const parsed = parseViewJson(result);
      return "data" in parsed ? parsed.data : { raw: parsed.raw };
    },
    run: async ({ caller }, { classId, beatsPercentage }) => {
      try {
        const prediction = await caller.bidPredictions.getBy({ classId });
        if (!prediction?.bidWindow) {
          return errText(`No prediction available for class ${classId} yet.`);
        }
        const factors = await caller.safetyFactors.getAll();
        const factor = findSafetyFactor(
          factors,
          prediction.bidWindow.acadTermId,
          beatsPercentage,
        );
        const base = prediction.medianPredicted;
        const uncertainty = prediction.medianUncertainty ?? 0;
        const multiplier = factor?.multiplier ?? null;
        const suggestedBidAmount = suggestBidAmount(
          base,
          multiplier,
          uncertainty,
        );
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
            ? rationaleFor(
                base,
                factor.multiplier,
                beatsPercentage,
                undefined,
                uncertainty,
              )
            : rationaleFor(base, null, beatsPercentage),
        });
      } catch (e) {
        return errText(errorMessage(e));
      }
    },
  };

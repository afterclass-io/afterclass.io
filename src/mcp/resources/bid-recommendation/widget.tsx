import { useWidget, type WidgetMetadata } from "mcp-use/react";
import { z } from "zod";

/**
 * Browser-iframe widget (MCP Apps) for `recommend-bid-amount`.
 * Must stay dependency-free: no `@/server/*`, no `next/*`.
 *
 * Props mirror the exact JSON the tool emits via `jsonText(...)` in
 * `src/server/mcp/tools/write/recommend.ts`:
 *   { classId, acadTermId, bidWindow, predictedMedian, suggestedBidAmount,
 *     multiplierUsed, rationale }
 */
const bidRecommendationPropsSchema = z.object({
  classId: z.string(),
  acadTermId: z.string(),
  bidWindow: z
    .object({
      id: z.number(),
      round: z.string(),
      window: z.number(),
    })
    .optional(),
  predictedMedian: z.number(),
  suggestedBidAmount: z.number(),
  multiplierUsed: z
    .object({
      beatsPercentage: z.number(),
      multiplier: z.number(),
    })
    .nullable()
    .optional(),
  rationale: z.string().optional(),
});

export const widgetMetadata: WidgetMetadata = {
  description: "Recommended bid amount for a class",
  props: bidRecommendationPropsSchema,
};

const BidRecommendation: React.FC = () => {
  const { props, isPending, theme } = useWidget<z.infer<typeof bidRecommendationPropsSchema>>();
  if (isPending) return <div>Loading...</div>;
  const dark = theme === "dark";
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
        background: dark ? "#1a1a2e" : "#fff",
      }}
    >
      <h3 style={{ margin: 0 }}>{props.classId}</h3>
      <p style={{ fontSize: 24, fontWeight: 600, margin: "8px 0" }}>${props.suggestedBidAmount}</p>
      {props.predictedMedian !== undefined && (
        <p style={{ margin: "4px 0" }}>Predicted median: ${props.predictedMedian}</p>
      )}
      {props.multiplierUsed && (
        <p style={{ margin: "4px 0" }}>
          Safety multiplier: {props.multiplierUsed.multiplier} (beats {props.multiplierUsed.beatsPercentage}%)
        </p>
      )}
      {props.rationale && <p style={{ margin: "4px 0", opacity: 0.7 }}>{props.rationale}</p>}
    </div>
  );
};

export default BidRecommendation;

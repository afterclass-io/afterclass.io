import { useWidget, type WidgetMetadata } from "mcp-use/react";
import { z } from "zod";

import { TOKENS, Skeleton } from "../shared/tokens";

/**
 * Browser-iframe widget (MCP Apps) for `get-course-reviews` and
 * `get-professor-reviews`. Must stay dependency-free: no `@/server/*`, no
 * `next/*`.
 *
 * Props are produced by the shared `reviewCardsProps` normalizer in
 * `src/server/mcp/tools/read/catalog.ts`:
 *   { context, reviews: ReviewCard[] }
 */
const reviewCardSchema = z.object({
  id: z.string(),
  body: z.string().nullable(),
  tips: z.string().nullable(),
  rating: z.number().nullable(),
  labels: z.array(z.string()),
  voteCount: z.number(),
  createdAt: z.string(),
  courseCode: z.string().nullable(),
  professorName: z.string().nullable(),
});

const reviewCardsPropsSchema = z.object({
  context: z.string(),
  reviews: z.array(reviewCardSchema),
});

export const widgetMetadata: WidgetMetadata = {
  description: "Student review cards for a course or professor",
  props: reviewCardsPropsSchema,
};

const ReviewCards: React.FC = () => {
  const { props, isPending, theme } = useWidget<
    z.infer<typeof reviewCardsPropsSchema>
  >() as unknown as {
    props: z.infer<typeof reviewCardsPropsSchema>;
    isPending: boolean;
    theme: string;
  };
  const dark = theme === "dark";
  const c = dark ? TOKENS.dark : TOKENS.light;
  if (isPending) return <Skeleton dark={dark} />;
  return (
    <div
      style={{
        fontFamily: "var(--font-inter, ui-sans-serif, system-ui)",
        color: c.cardFg,
        background: c.card,
        border: `1px solid ${c.border}`,
        borderRadius: c.radius,
        padding: 16,
        boxSizing: "border-box",
        maxWidth: 480,
      }}
    >
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      {/* Header: title + context badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>Reviews</span>
        {props.context && (
          <span
            style={{
              fontFamily: "var(--font-geist-mono, ui-monospace)",
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 9999,
              background: dark
                ? "oklch(0.488 0.243 264.376 / 15%)"
                : "oklch(0.546 0.245 262.881 / 12%)",
              color: dark
                ? "oklch(0.623 0.214 259.815)"
                : "oklch(0.488 0.243 264.376)",
              border: `1px solid ${c.border}`,
            }}
          >
            {props.context}
          </span>
        )}
      </div>
      {props.reviews.length === 0 ? (
        <p style={{ margin: "12px 0 0", fontSize: 13, color: c.mutedFg }}>
          No reviews yet.
        </p>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: 12,
            maxHeight: 420,
            overflowY: "auto",
          }}
        >
          {props.reviews.map((review) => (
            <div
              key={review.id}
              style={{
                border: `1px solid ${c.border}`,
                borderRadius: c.radius,
                padding: 12,
              }}
            >
              {review.rating !== null && (
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: c.primary,
                  }}
                >
                  ★ {review.rating}/5
                </div>
              )}
              {review.body && (
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  {review.body}
                </p>
              )}
              {review.tips && (
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 12,
                    color: c.mutedFg,
                    lineHeight: 1.5,
                  }}
                >
                  Tips: {review.tips}
                </p>
              )}
              {review.labels.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                    marginTop: 8,
                  }}
                >
                  {review.labels.map((label) => (
                    <span
                      key={label}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 9999,
                        background: dark
                          ? "oklch(0.488 0.243 264.376 / 15%)"
                          : "oklch(0.546 0.245 262.881 / 12%)",
                        color: dark
                          ? "oklch(0.623 0.214 259.815)"
                          : "oklch(0.488 0.243 264.376)",
                        border: `1px solid ${c.border}`,
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: c.mutedFg,
                }}
              >
                {review.voteCount} upvotes
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewCards;

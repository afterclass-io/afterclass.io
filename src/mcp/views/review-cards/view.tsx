import type React from "react";
import type { ViewConfig } from "mcp-use/react";
import { useToolContext, useViewTheme } from "mcp-use/react";
import type { ReviewCardsData } from "../../view-tools/schemas";
import { TOKENS, Skeleton } from "../shared/tokens";

/**
 * MCP App View (mcp-use v2) for the `get-course-reviews` tool. Must stay
 * dependency-free: no `@/server/*`, no `next/*`.
 *
 * The review-card layout, labels and tokens are copied verbatim from the v1
 * `resources/review-cards/widget.tsx`; only the data channels changed:
 *
 *   v1 useWidget().props            -> v2 useToolContext().toolOutput
 *   v1 useWidget().isPending        -> v2 status === "pending"
 *   v1 useWidget().theme            -> v2 useViewTheme()
 *   v1 widgetMetadata export        -> v2 viewConfig export
 *
 * `get-professor-reviews` is viewless (Controller Ruling §0.7 — no second
 * View dir); it returns text only.
 */

export const viewConfig = {
  autoResize: true,
  displayModes: ["inline", "fullscreen", "pip"],
} satisfies ViewConfig;

const ReviewCardsView: React.FC = () => {
  const { status, toolOutput, error } = useToolContext<"get-course-reviews">();
  const theme = useViewTheme();
  const dark = theme === "dark";
  const c = dark ? TOKENS.dark : TOKENS.light;
  if (status === "pending") return <Skeleton dark={dark} />;
  if (status === "error") {
    return (
      <div
        role="alert"
        style={{
          fontFamily: "var(--font-inter, ui-sans-serif, system-ui)",
          color: c.cardFg,
          background: c.card,
          border: `1px solid ${c.border}`,
          borderRadius: c.radius,
          padding: 16,
        }}
      >
        {error.message}
      </div>
    );
  }
  // `toolOutput` is {context, reviews} from the tool's outputSchema. The tool
  // adapter currently passes its schemas `as never` (Task 9 candidate to
  // tighten), so read defensively exactly like the v1 widget read `props`.
  const props = toolOutput as ReviewCardsData | undefined;
  const reviews = props?.reviews ?? [];
  const context = props?.context ?? "";
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
        {context && (
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
            {context}
          </span>
        )}
      </div>
      {reviews.length === 0 ? (
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
          {reviews.map((review) => (
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

export default ReviewCardsView;

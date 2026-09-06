import type React from "react";
import type { ThemeColors } from "../tokens";

/**
 * Shared review-card static core (extracted from
 * `views/review-cards/view.tsx`). Presentational only: rating / labels /
 * body / tips / votes / course-professor context. No interactivity (votes,
 * reactions stay website-only), no hooks.
 *
 * M3 render decision (implemented here): `createdAt` renders as a date line
 * (`YYYY-MM-DD` slice of the ISO string) when present and non-empty; empty
 * string (the catalog empty-string default) renders nothing — never
 * "Invalid Date", never "null".
 *
 * NOTE: course/professor context is deliberately NOT rendered here — it
 * lives in the view shell's header badge (`views/review-cards/view.tsx`).
 * Rendering it per-card would duplicate the header text and break the
 * existing `getByText(context)` view assertions.
 */
export type ReviewCardData = {
  id: string;
  body: string | null;
  tips: string | null;
  rating: number | null;
  labels: string[];
  voteCount: number;
  createdAt: string;
  courseCode: string | null;
  professorName: string | null;
};

const badgeStyle = (c: ThemeColors, dark: boolean): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  padding: "2px 8px",
  borderRadius: 9999,
  background: dark
    ? "oklch(0.488 0.243 264.376 / 15%)"
    : "oklch(0.546 0.245 262.881 / 12%)",
  color: dark ? "oklch(0.623 0.214 259.815)" : "oklch(0.488 0.243 264.376)",
  border: `1px solid ${c.border}`,
});

export const ReviewCard: React.FC<{
  review: ReviewCardData;
  c: ThemeColors;
  dark: boolean;
}> = ({ review, c, dark }) => (
  <div
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
          <span key={label} style={badgeStyle(c, dark)}>
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
      {review.createdAt ? ` · ${String(review.createdAt).slice(0, 10)}` : ""}
    </div>
  </div>
);

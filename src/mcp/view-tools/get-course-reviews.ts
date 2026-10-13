import { coursePage } from "@/server/mcp/tools/page-links";
import { censorProfanity } from "@/server/profanity";
import { reviewCardsOutput } from "./schemas";
import { registerViewTool } from "./make-view-tool";

// Shared lookup + named-throw + registration derivation.
export const getCourseReviews = registerViewTool({
  name: "get-course-reviews",
  view: { name: "review-cards", description: "Course reviews" },
  outputSchema: reviewCardsOutput,
  rawPayloadMessage: "Invalid review payload",
  summarize: (data) => {
    const sc = data as {
      context?: string;
      reviews?: Array<{
        body?: string | null;
        tips?: string | null;
        rating?: number | null;
        labels?: string[];
        professorName?: string | null;
      }>;
    };
    const reviews = Array.isArray(sc.reviews) ? sc.reviews : [];
    const head = `Reviews for ${sc.context ?? ""} — ${reviews.length} reviews`;
    // Page link from own output only (context echoes the queried code) —
    // never invented; omitted when context is absent.
    const link =
      typeof sc.context === "string" && sc.context.length > 0
        ? `\nFull reviews: ${coursePage(sc.context)}`
        : "";
    if (reviews.length === 0) return `${head}${link}`;
    // One line per review: rating, labels, professor, body-or-tips
    // snippet (truncated so a 20-review payload stays compact).
    const lines = reviews.map((r) => {
      const stars = typeof r.rating === "number" ? `★${r.rating}` : "★?";
      const labels =
        Array.isArray(r.labels) && r.labels.length > 0
          ? ` [${r.labels.join(", ")}]`
          : "";
      const prof = r.professorName ? ` ${r.professorName}` : "";
      const snippet = censorProfanity((r.body ?? r.tips ?? "").slice(0, 120));
      return `${stars}${labels}${prof} — ${snippet}`.trim();
    });
    return `${head}:\n${lines.join("\n")}${link}`;
  },
});

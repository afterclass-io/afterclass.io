import { formatPercentage, toTitleCase } from "@/common/functions";

/** Average rating as shown on the card. Zero reviews show a dash, never a rating. */
export function toOgRating(averageRating: number, reviewCount: number): string {
  return reviewCount > 0 ? averageRating.toFixed(2) : "-";
}

/** One stat row per review label: its title-cased name and its share of all reviews. */
export function toOgStatItems(
  reviewLabels: { name: string; count: number }[],
  reviewCount: number,
) {
  return reviewLabels.map((label) => ({
    label: toTitleCase(label.name),
    value: formatPercentage(label.count && label.count / reviewCount),
  }));
}

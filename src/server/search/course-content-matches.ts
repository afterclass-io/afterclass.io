import { Prisma } from "@/generated/prisma/client";

/**
 * Keep these candidates separate from the outer OR so PostgreSQL can use
 * the existing code trigram index and the content expression indexes.
 * IN supplies set membership, so UNION ALL avoids unnecessary sorting/deduplication.
 * Directional word similarity cannot exceed query trigrams / field trigrams.
 * The conservative +1 bound covers rounding; the original score is still checked.
 */
export function courseContentMatches(
  q: string,
  qLike: string,
  tsQuery: string | null,
) {
  return Prisma.sql`
    SELECT c.id FROM courses c
    WHERE c.code ILIKE ('%' || ${qLike} || '%')
    UNION ALL
    SELECT c.id FROM courses c
    WHERE to_tsvector('simple', c.code || ' ' || c.name || ' ' || COALESCE(c.description,'') || ' ' || COALESCE(c.course_area,''))
      @@ to_tsquery('simple', ${tsQuery}::text)
    UNION ALL
    SELECT c.id FROM courses c
    WHERE cardinality(show_trgm(COALESCE(c.description,''))) BETWEEN 1
      AND (ceil(cardinality(show_trgm(${q}::text)) / 0.3) + 1)::int
      AND word_similarity(COALESCE(c.description,''), ${q}) > 0.3
    UNION ALL
    SELECT c.id FROM courses c
    WHERE cardinality(show_trgm(COALESCE(c.course_area,''))) BETWEEN 1
      AND (ceil(cardinality(show_trgm(${q}::text)) / 0.3) + 1)::int
      AND word_similarity(COALESCE(c.course_area,''), ${q}) > 0.3
  `;
}

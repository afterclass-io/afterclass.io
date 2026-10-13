import { Prisma } from "@/generated/prisma/client";
import { escapeLike, toCodeKey } from "./query";

/** Fixed SQL aliases c/p; all user text remains bound parameters. */
export function coursePredicates(q: string, tsQuery: string | null) {
  const qLike = escapeLike(q);
  const codeLike = escapeLike(toCodeKey(q));
  const code = Prisma.sql`(
    c.code ILIKE ('%' || ${qLike} || '%')
    OR REPLACE(c.code, '-', '') LIKE ('%' || ${codeLike} || '%')
  )`;
  const fullText = Prisma.sql`to_tsvector('simple', c.code || ' ' || c.name || ' ' || COALESCE(c.description,'') || ' ' || COALESCE(c.course_area,''))
    @@ to_tsquery('simple', ${tsQuery}::text)`;
  const name = Prisma.sql`c.name ILIKE ('%' || ${qLike} || '%')`;
  const nameText = Prisma.sql`to_tsvector('simple', c.name) @@ to_tsquery('simple', ${tsQuery}::text)`;
  const fuzzy = Prisma.sql`(
    word_similarity(c.name, ${q}) > 0.3
    OR word_similarity(COALESCE(c.description,''), ${q}) > 0.3
    OR word_similarity(COALESCE(c.course_area,''), ${q}) > 0.3
    OR similarity(c.code, ${q}) > 0.3
  )`;
  const keyword = Prisma.sql`(${code} OR ${fullText})`;
  const pageKeyword = Prisma.sql`(${keyword} OR ${name}
    OR COALESCE(c.description,'') ILIKE ('%' || ${qLike} || '%')
    OR COALESCE(c.course_area,'') ILIKE ('%' || ${qLike} || '%'))`;
  return { keyword, pageKeyword, fuzzy, name, nameText };
}

export function professorPredicates(q: string, tsQuery: string | null) {
  const qLike = escapeLike(q);
  const keyword = Prisma.sql`(
    p.name ILIKE ('%' || ${qLike} || '%')
    OR REPLACE(p.name, ',', '') ILIKE ('%' || ${qLike} || '%')
    OR p.slug ILIKE ('%' || ${qLike} || '%')
    OR EXISTS (SELECT 1 FROM unnest(p.boss_aliases) AS alias
      WHERE alias ILIKE ('%' || ${qLike} || '%'))
    OR to_tsvector('simple', p.name) @@ to_tsquery('simple', ${tsQuery}::text)
  )`;
  const fuzzy = Prisma.sql`word_similarity(p.name, ${q}) > 0.3`;
  const pageKeyword = Prisma.sql`(${keyword}
    OR to_tsvector('simple', p.slug || ' ' || COALESCE(array_to_string(p.boss_aliases, ' '), ''))
      @@ to_tsquery('simple', ${tsQuery}::text))`;
  return { keyword, pageKeyword, fuzzy };
}

export const PUBLIC_CACHEABLE_PROCEDURES: ReadonlySet<string> = new Set([
  "courses.getAllByUniAbbrv",
  "courses.getByCourseCode",
  "courses.getByProfSlug",
  "courses.countByProfSlug",
  "professors.getAllByUniAbbrv",
  "professors.getByCourseCode",
  "professors.getByProfSlug",
  "classes.getAll",
  "classes.getAllByCourseId",
  "bidResults.getByCourseProfessor",
  "bidResults.getBy",
  "bidPredictions.getBy",
  "reviews.getMetadataForCourse",
  "reviews.getMetadataForProf",
  "reviews.getAll",
  "reviews.getByCourseCode",
  "reviews.getByProfSlug",
  "reviews.count",
  "acadTerms.current",
  "acadTerms.getAll",
  "safetyFactors.getAll",
  "labels.getAllByType",
]);

const PUBLIC_CACHE_VALUE =
  "public, s-maxage=1800, stale-while-revalidate=86400";
const PRIVATE_CACHE_VALUE =
  "private, no-cache, no-store, max-age=0, must-revalidate";

export function getCacheControlForTrpcRequest({
  type,
  paths,
  errors,
}: {
  type: string;
  paths: readonly string[] | undefined;
  errors: readonly unknown[];
}) {
  const cacheable =
    type === "query" &&
    errors.length === 0 &&
    !!paths &&
    paths.length > 0 &&
    paths.every((path) => PUBLIC_CACHEABLE_PROCEDURES.has(path));
  const value = cacheable ? PUBLIC_CACHE_VALUE : PRIVATE_CACHE_VALUE;
  return {
    "Cache-Control": value,
    "CDN-Cache-Control": value,
    "Vercel-CDN-Cache-Control": value,
  };
}

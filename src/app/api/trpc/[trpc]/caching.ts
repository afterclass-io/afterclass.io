// A procedure belongs here only if its response is identical for every
// anonymous caller and needs no secret input. Never add a procedure that
// accepts a share or bearer token. Gated procedures read ctx.session only to
// decide access: an anonymous request succeeds only for a public domain, so
// only anonymous responses are CDN-cached and signed-in ones stay private.
export const PUBLIC_CACHEABLE_PROCEDURES: ReadonlySet<string> = new Set([
  "courses.getAllByUniAbbrv",
  "courses.getByCourseCode",
  "courses.getByProfSlug",
  "courses.countByProfSlug",
  "professors.getAllByUniAbbrv",
  "professors.getByCourseCode",
  "professors.getBySlug",
  "professors.getProfessorsByClassId",
  "professors.countByCourseCode",
  "classes.getAll",
  "classes.getAllByCourseId",
  "bidResults.getByCourseProfessor",
  "bidResults.getBy",
  "bidPredictions.getBy",
  "bidWindows.getByAcadTerm",
  "bidWindows.getCurrentWindow",
  "reviews.getMetadataForCourse",
  "reviews.getMetadataForProf",
  "reviews.getAll",
  "reviews.getByCourseCode",
  "reviews.getByProfSlug",
  "reviews.count",
  "reviewVotes.count",
  "acadTerms.current",
  "safetyFactors.getAll",
  "labels.getAllByType",
  "labels.getAll",
  "faculties.list",
  "roadmaps.listPublic",
  "roadmapVotes.count",
]);

const PUBLIC_CACHE_VALUE =
  "public, s-maxage=1800, stale-while-revalidate=86400";
const PRIVATE_CACHE_VALUE =
  "private, no-cache, no-store, max-age=0, must-revalidate";

export function getCacheControlForTrpcRequest({
  type,
  paths,
  errors,
  eagerGeneration,
  signedIn = false,
}: {
  type: string;
  paths: readonly string[] | undefined;
  errors: readonly unknown[];
  eagerGeneration?: boolean;
  signedIn?: boolean;
}) {
  const cacheable =
    !eagerGeneration &&
    !signedIn &&
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

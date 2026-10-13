/** Cache policy shared by every generated OG image response. */
export const OG_IMAGE_HEADERS = {
  "Cache-Control":
    "public, immutable, no-transform, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
};

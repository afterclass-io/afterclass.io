import type { PublicDataDomain } from "@/server/ecfg/config";
import { getEdgeConfig } from "@/server/ecfg/edge-config";

/**
 * Domains a domain's rows always reference. A child is effectively public only
 * when its own flag and every parent are public, so the store can never expose
 * data through a child (a review card names its course) while the parent stays
 * private. Classes and reviews also name a professor when they have one; a
 * caller that returns such rows checks `professors` for them itself.
 */
export const PUBLIC_DATA_PARENTS = {
  courses: [],
  professors: [],
  classData: ["courses", "professors"],
  reviews: ["courses"],
  publicRoadmaps: ["courses"],
} as const satisfies Record<PublicDataDomain, readonly PublicDataDomain[]>;

/** Applies the hierarchy to the raw store flags. */
export function resolvePublicData(
  raw: Record<PublicDataDomain, boolean>,
): Record<PublicDataDomain, boolean> {
  const isPublic = (domain: PublicDataDomain): boolean =>
    raw[domain] === true &&
    PUBLIC_DATA_PARENTS[domain].every((parent) => isPublic(parent));

  return {
    courses: isPublic("courses"),
    professors: isPublic("professors"),
    classData: isPublic("classData"),
    reviews: isPublic("reviews"),
    publicRoadmaps: isPublic("publicRoadmaps"),
  };
}

/**
 * True only if every listed domain is effectively public to anonymous users
 * (see `PUBLIC_DATA_PARENTS`). Pages and procedures name the domain of the
 * data they return; list several only for a join of sibling domains. Fails
 * closed: any Edge Config read or parse failure makes every domain private.
 */
export async function isDataPublic(
  ...domains: PublicDataDomain[]
): Promise<boolean> {
  try {
    const { publicData } = await getEdgeConfig();
    const effective = resolvePublicData(publicData);
    return domains.every((domain) => effective[domain]);
  } catch {
    return false;
  }
}

/**
 * Signed-in users see every domain without an Edge Config read; anonymous
 * users need every listed domain to be effectively public.
 */
export async function canViewData(
  session: { user?: unknown } | null,
  ...domains: PublicDataDomain[]
): Promise<boolean> {
  if (session?.user) return true;
  return isDataPublic(...domains);
}

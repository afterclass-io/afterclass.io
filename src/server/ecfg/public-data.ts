import type { PublicDataDomain } from "@/server/ecfg/config";
import { getEdgeConfig } from "@/server/ecfg/edge-config";

/**
 * True only if every listed domain is public to anonymous users. Fails closed:
 * any Edge Config read or parse failure makes every domain private.
 */
export async function isDataPublic(
  ...domains: PublicDataDomain[]
): Promise<boolean> {
  try {
    const { publicData } = await getEdgeConfig();
    return domains.every((domain) => publicData[domain] === true);
  } catch {
    return false;
  }
}

/**
 * Signed-in users see every domain without an Edge Config read; anonymous
 * users need every listed domain to be public.
 */
export async function canViewData(
  session: { user?: unknown } | null,
  ...domains: PublicDataDomain[]
): Promise<boolean> {
  if (session?.user) return true;
  return isDataPublic(...domains);
}

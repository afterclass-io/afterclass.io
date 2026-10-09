import { getEdgeConfig } from "@/server/ecfg/edge-config";

/**
 * The single answer to "is password login on?". Reads process.env at call time.
 * Precedence:
 * 1. VERCEL_ENV === "production": the Edge Config flag only (default false).
 * 2. NODE_ENV === "development": on, unless ENABLE_PASSWORD_LOGIN === "false".
 * 3. ENABLE_PASSWORD_LOGIN === "true": on (preview opt-in).
 * 4. Otherwise: the Edge Config flag, default false.
 */
export async function isPasswordLoginEnabled(): Promise<boolean> {
  if (process.env.VERCEL_ENV === "production") {
    const ecfg = await getEdgeConfig().catch(() => null);
    return ecfg?.enablePasswordLogin ?? false;
  }

  if (process.env.NODE_ENV === "development") {
    return process.env.ENABLE_PASSWORD_LOGIN !== "false";
  }

  if (process.env.ENABLE_PASSWORD_LOGIN === "true") {
    return true;
  }

  const ecfg = await getEdgeConfig().catch(() => null);
  return ecfg?.enablePasswordLogin ?? false;
}

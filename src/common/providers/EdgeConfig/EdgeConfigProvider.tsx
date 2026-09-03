import { unstable_cache } from "next/cache";
import { getAll } from "@vercel/edge-config";
import { edgeConfigSchema, EDGE_CONFIG_CACHE_TAG } from "@/server/ecfg/config";
import { EdgeConfigContextProvider } from "./EdgeConfigContextProvider";

async function fetchAndValidateEdgeConfig() {
  try {
    const rawConfig = await getAll();
    const result = edgeConfigSchema.safeParse(rawConfig);

    if (!result.success) {
      console.warn(
        "Failed to parse edge config:\n",
        result.error.message,
        "\nReceived config:\n",
        rawConfig,
      );
      return null;
    }

    return result.data;
  } catch (error) {
    console.warn(
      "Failed to fetch edge config:\n",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

// Cached for 24h; tagged `EDGE_CONFIG_CACHE_TAG` so an operator can push a
// config change and invalidate on demand via `POST /api/revalidate` without
// deploying (see src/server/ecfg/README.md).
const getCachedEdgeConfig = unstable_cache(
  fetchAndValidateEdgeConfig,
  ["edge-config", "get-all"],
  { revalidate: 86400, tags: [EDGE_CONFIG_CACHE_TAG] },
);

async function getFallbackConfig() {
  return (await import("@/server/ecfg/config.json")).default;
}

export async function getEdgeConfig() {
  return (await getCachedEdgeConfig()) ?? (await getFallbackConfig());
}

export async function EdgeConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const edgeConfig = await getEdgeConfig();

  return (
    <EdgeConfigContextProvider edgeConfig={edgeConfig}>
      {children}
    </EdgeConfigContextProvider>
  );
}

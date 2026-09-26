import { unstable_cache } from "next/cache";
import { getAll } from "@vercel/edge-config";
import { edgeConfigSchema } from "@/server/ecfg/config";
import { EdgeConfigContextProvider } from "./EdgeConfigContextProvider";

// Throws on parse/fetch failure so `unstable_cache` never stores a failure for
// the whole revalidation window; callers fall back to the bundled JSON outside
// the cache.
async function fetchAndValidateEdgeConfig() {
  let rawConfig: Awaited<ReturnType<typeof getAll>>;
  try {
    rawConfig = await getAll();
  } catch (error) {
    console.warn(
      "Failed to fetch edge config:\n",
      error instanceof Error ? error.message : error,
    );
    throw error instanceof Error ? error : new Error(String(error));
  }

  const result = edgeConfigSchema.safeParse(rawConfig);
  if (!result.success) {
    console.warn(
      "Failed to parse edge config:\n",
      result.error.message,
      "\nReceived config:\n",
      rawConfig,
    );
    throw new Error("Failed to parse edge config");
  }

  return result.data;
}

async function getFallbackConfig() {
  return (await import("@/server/ecfg/config.json")).default;
}

export async function getEdgeConfig() {
  try {
    const cached = unstable_cache(fetchAndValidateEdgeConfig, ["edge-config"], {
      revalidate: 86_400,
      tags: ["edge-config"],
    });
    return await cached();
  } catch (error) {
    // Outside the Next runtime (standalone MCP `mcp-use`, which shims
    // `next/cache`) `unstable_cache` throws "incrementalCache missing". Fall
    // back to the existing uncached fetch so chat-config/MCP keep working.
    if (error instanceof Error && error.message.includes("incrementalCache")) {
      try {
        return await fetchAndValidateEdgeConfig();
      } catch {
        // fall through to the bundled config below
      }
    }
    // A parse/fetch failure is never cached: it lands here and falls back.
    return getFallbackConfig();
  }
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

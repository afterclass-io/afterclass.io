import { getAll } from "@vercel/edge-config";
import { edgeConfigSchema } from "@/server/ecfg/config";
import { EdgeConfigContextProvider } from "./EdgeConfigContextProvider";

async function fetchAndValidateEdgeConfig() {
  try {
    // * FUTURE NOTE *
    // if edge requests count nears the threshold,
    // we should consider caching the edge config & revalidate every 24h
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

async function getFallbackConfig() {
  return (await import("@/server/ecfg/config.json")).default;
}

export async function getEdgeConfig() {
  const config =
    (await fetchAndValidateEdgeConfig()) ?? (await getFallbackConfig());
  // The moderation switch is remote-only, and local dev usually has no working
  // remote store, so it would stay off and hide the report buttons. Like
  // password login, dev turns it on unless ENABLE_CONTENT_MODERATION is
  // "false". Production never takes this branch.
  if (
    process.env.NODE_ENV === "development" &&
    process.env.ENABLE_CONTENT_MODERATION !== "false"
  ) {
    return { ...config, enableContentModeration: true };
  }
  return config;
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

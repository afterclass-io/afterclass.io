import { getAll } from "@vercel/edge-config";
import { edgeConfigSchema, type EdgeConfig } from "@/server/ecfg/config";
import fallbackConfig from "@/server/ecfg/config.json";

type EdgeConfigKey = keyof EdgeConfig;

const edgeConfigKeys = Object.keys(edgeConfigSchema.shape) as EdgeConfigKey[];

function parseFallbackConfig(): EdgeConfig {
  return edgeConfigSchema.parse(fallbackConfig);
}

/**
 * Validates the store one top-level key at a time. A bad or missing key takes
 * the `config.json` value for that key only, so one bad key never discards
 * the production choices held in the other keys.
 */
function mergeStoreWithFallback(raw: Record<string, unknown>): EdgeConfig {
  // Parsed on the first bad key only: a fully valid store never pays for it.
  let fallback: EdgeConfig | undefined;
  const merged: Record<string, unknown> = {};

  for (const key of edgeConfigKeys) {
    const result = edgeConfigSchema.shape[key].safeParse(raw[key]);
    if (result.success) {
      merged[key] = result.data;
      continue;
    }
    console.warn(
      `Edge config key "${key}" is missing or invalid; using the config.json value:\n`,
      result.error.message,
    );
    fallback ??= parseFallbackConfig();
    merged[key] = fallback[key];
  }

  return merged as EdgeConfig;
}

export async function getEdgeConfig(): Promise<EdgeConfig> {
  try {
    // * FUTURE NOTE *
    // if edge requests count nears the threshold,
    // we should consider caching the edge config & revalidate every 24h
    const rawConfig: unknown = await getAll();

    if (
      typeof rawConfig !== "object" ||
      rawConfig === null ||
      Array.isArray(rawConfig)
    ) {
      console.warn(
        "Edge config is not an object; using the config.json values.",
      );
      return parseFallbackConfig();
    }

    return mergeStoreWithFallback(rawConfig as Record<string, unknown>);
  } catch (error) {
    console.warn(
      "Failed to fetch edge config:\n",
      error instanceof Error ? error.message : error,
    );
    return parseFallbackConfig();
  }
}

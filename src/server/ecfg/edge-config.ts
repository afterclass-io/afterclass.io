import { getAll } from "@vercel/edge-config";
import { unstable_cache } from "next/cache";
import {
  chatTunablesSchema,
  edgeConfigSchema,
  type EdgeConfig,
} from "@/server/ecfg/config";
import fallbackConfig from "@/server/ecfg/config.json";

type EdgeConfigKey = keyof EdgeConfig;

const edgeConfigKeys = Object.keys(edgeConfigSchema.shape) as EdgeConfigKey[];

/** Tag for on-demand invalidation, see `/api/revalidate/edge-config`. */
export const EDGE_CONFIG_CACHE_TAG = "edge-config";

// A window of 24 hours is safe because an operator can push a change at once
// by revalidating the tag. Edge Config bills per read, and this call sat in
// the root layout, so it used to run on every server render of every route.
const EDGE_CONFIG_REVALIDATE_SECONDS = 86_400;

// Only the raw store read is cached. A failed read throws before anything is
// stored, so a transient outage never pins the `config.json` fallback for the
// whole window. Validation and the per-key fallback below run on every call.
const readCachedStore = unstable_cache(
  async (): Promise<unknown> => getAll(),
  ["edge-config", "store"],
  { revalidate: EDGE_CONFIG_REVALIDATE_SECONDS, tags: [EDGE_CONFIG_CACHE_TAG] },
);

async function readStore(): Promise<unknown> {
  try {
    return await readCachedStore();
  } catch (error) {
    // Outside the Next.js runtime (standalone `mcp-use dev/start`, scripts,
    // unit tests) `unstable_cache` throws "incrementalCache missing". Read
    // directly there. Any other failure rethrows to the caller's fallback.
    if (error instanceof Error && error.message.includes("incrementalCache")) {
      return getAll();
    }
    throw error;
  }
}

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
    const value = raw[key];
    if (
      key === "chat" &&
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      const chat: Record<string, unknown> = {};
      const chatKeys = Object.keys(
        chatTunablesSchema.shape,
      ) as (keyof typeof chatTunablesSchema.shape)[];
      for (const chatKey of chatKeys) {
        const result = chatTunablesSchema.shape[chatKey].safeParse(
          (value as Record<string, unknown>)[chatKey],
        );
        if (result.success) {
          if (result.data !== undefined) chat[chatKey] = result.data;
        } else {
          console.warn(
            `Edge config key "chat.${chatKey}" is invalid; using the config.json value:\n`,
            result.error.message,
          );
          fallback ??= parseFallbackConfig();
          const fallbackValue = fallback.chat?.[chatKey];
          if (fallbackValue !== undefined) chat[chatKey] = fallbackValue;
        }
      }
      merged.chat = edgeConfigSchema.shape.chat.parse(chat);
      continue;
    }
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
    const rawConfig = await readStore();

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

import fs from "fs";
import { type RemoteItem, fetchRemoteItems } from "@/server/ecfg/remote";

/**
 * Normalizes the Edge Config response into the desired format.
 * @param items The array of Edge Config items.
 * @returns A normalized object with keys and values.
 */
function normalizeEdgeConfig(
  items: readonly RemoteItem[],
): Record<string, unknown> {
  const normalizedConfig: Record<string, unknown> = {};
  for (const item of items) {
    normalizedConfig[item.key] = item.value;
  }
  return normalizedConfig;
}

async function main(): Promise<void> {
  const vercelApiToken = process.env.VERCEL_TOKEN;
  const edgeConfigId = process.env.VERCEL_EDGE_CONFIG_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  const jsonFilePath = process.argv[2] ?? "src/server/ecfg/config.json";

  if (!vercelApiToken || !edgeConfigId) {
    console.error("Usage: bun run scripts/ecfg/fetch-all.ts [jsonFilePath]");
    console.error(
      "Environment variables VERCEL_TOKEN and VERCEL_EDGE_CONFIG_ID are required.",
    );
    process.exit(1);
  }

  try {
    const items = await fetchRemoteItems({
      token: vercelApiToken,
      edgeConfigId,
      teamId,
    });

    const normalizedConfig = normalizeEdgeConfig(items);
    const edgeConfigJson = JSON.stringify(normalizedConfig, null, 2);
    fs.writeFileSync(jsonFilePath, edgeConfigJson);

    console.log(`Edge Config: ${edgeConfigJson}`);
    console.log(`Edge Config saved to ${jsonFilePath}`);
  } catch (error) {
    console.error(
      "Failed to fetch Edge Config:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

// Fetch and normalize the Edge Config
void main();

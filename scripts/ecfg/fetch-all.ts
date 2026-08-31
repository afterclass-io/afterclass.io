import fs from "fs";
import { fetchEdgeConfig } from "./utils";
import type { EdgeConfigItems } from "./utils";

/**
 * Normalizes the Edge Config response into the desired format.
 * @param items The array of Edge Config items.
 * @returns A normalized object with keys and values.
 */
function normalizeEdgeConfig(items: EdgeConfigItems): Record<string, any> {
  const normalizedConfig: Record<string, any> = {};
  for (const item of items) {
    normalizedConfig[item.key] = item.value;
  }
  return normalizedConfig;
}

async function main(
  vercelApiToken: string,
  edgeConfigId: string,
  jsonFilePath: string,
): Promise<void> {
  const items = await fetchEdgeConfig(vercelApiToken, edgeConfigId);

  const normalizedConfig = normalizeEdgeConfig(items);
  // Write the normalized config to the specified JSON file path
  const edgeConfigJson = JSON.stringify(normalizedConfig, null, 2);
  fs.writeFileSync(jsonFilePath, edgeConfigJson);

  console.log(`Edge Config: ${edgeConfigJson}`);
  console.log(`Edge Config saved to ${jsonFilePath}`);
}

// Get input arguments
const [vercelApiToken, edgeConfigId, jsonFilePath] = process.argv.slice(2);

if (!vercelApiToken || !edgeConfigId || !jsonFilePath) {
  console.error(
    "Usage: fetch-and-normalize-edge-config.ts <vercelApiToken> <edgeConfigId> <jsonFilePath>",
  );
  process.exit(1);
}

// Fetch and normalize the Edge Config
void main(vercelApiToken, edgeConfigId, jsonFilePath);

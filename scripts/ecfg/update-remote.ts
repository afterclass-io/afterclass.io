import readJson from "../utils/readJson";
import { fetchEdgeConfig } from "./utils";

async function convertExistingConfigToDeleteItems(
  vercelApiToken: string,
  edgeConfigId: string,
) {
  const items = await fetchEdgeConfig(vercelApiToken, edgeConfigId);
  const deleteItems = items.map((item) => ({
    operation: "delete",
    key: item.key,
  }));
  return deleteItems;
}

/**
 * Converts a JSON object into an array of items with top-level keys and JSON values for upsert operations.
 * @param obj The JSON object to process.
 * @returns An array of upsert operations.
 */
function convertJsonToUpsertItems(
  obj: Record<string, any>,
): { operation: string; key: string; value: any }[] {
  return Object.entries(obj).map(([key, value]) => ({
    operation: "upsert",
    key,
    value,
  }));
}

/**
 * Updates the Vercel Edge Config with data from a JSON file.
 * @param vercelApiToken The Vercel API token.
 * @param edgeConfigId The Edge Config ID.
 * @param jsonFilePath The path to the JSON file containing config data.
 */
async function updateEdgeConfig(
  vercelApiToken: string,
  edgeConfigId: string,
  jsonFilePath: string,
): Promise<void> {
  try {
    // Load the JSON file
    const json = readJson(jsonFilePath);
    const updatedItems = convertJsonToUpsertItems(json);

    // prepare delete operations for all existing items
    const deleteItems = await convertExistingConfigToDeleteItems(
      vercelApiToken,
      edgeConfigId,
    );

    const items = [...deleteItems, ...updatedItems];
    console.log("Items:", items);

    // Make the PATCH request to Vercel Edge Config API
    const response = await fetch(
      `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${vercelApiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Failed to update Edge Config:", result);
      process.exit(1);
    }

    console.log("Edge Config updated successfully:", result);
  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  }
}

// Get input arguments
const [vercelApiToken, edgeConfigId, jsonFilePath] = process.argv.slice(2);

if (!vercelApiToken || !edgeConfigId || !jsonFilePath) {
  console.error(
    "Usage: update-edge-config.ts <vercelApiToken> <edgeConfigId> <jsonFilePath>",
  );
  process.exit(1);
}

// Update the Edge Config
void updateEdgeConfig(vercelApiToken, edgeConfigId, jsonFilePath);

import { z } from "zod";

/**
 * Define the Zod schema for an Edge Config item.
 */
export const edgeConfigItemSchema = z.object({
  key: z.string(),
  value: z.any(),
});

export const edgeConfigResponseSchema = z.array(edgeConfigItemSchema);

export type EdgeConfigItems = z.infer<typeof edgeConfigResponseSchema>;

/**
 * Fetches the Vercel Edge Config and stores it in a JSON file.
 * @param vercelApiToken The Vercel API token.
 * @param edgeConfigId The Edge Config ID.
 * @param jsonFilePath The path to the JSON file to store the config data.
 */
export async function fetchEdgeConfig(
  vercelApiToken: string,
  edgeConfigId: string,
): Promise<EdgeConfigItems> {
  try {
    // Build the URL
    const url = `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`;

    // Make the GET request to Vercel Edge Config API
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${vercelApiToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch Edge Config: ${errorText}`);
    }

    const responseData = await response.json();
    return edgeConfigResponseSchema.parse(responseData);
  } catch (error) {
    console.error("An error occurred:", error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

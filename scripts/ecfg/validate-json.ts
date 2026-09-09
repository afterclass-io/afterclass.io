import readJson from "../utils/readJson";
import { edgeConfigSchema } from "@/server/ecfg/config";

/**
 * Validates edge config json file against the zod schema
 * @param jsonFilePath Path to the json file
 */
function validateJson(jsonFilePath: string): void {
  try {
    const json: unknown = readJson<unknown>(jsonFilePath);

    const validate = edgeConfigSchema.safeParse(json);

    if (validate.success) {
      console.log("JSON is valid!");
    } else {
      console.error("JSON validation failed:", validate.error.message);
      process.exit(1);
    }
  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  }
}

// Get input arguments
const [jsonFilePath] = process.argv.slice(2);

if (!jsonFilePath) {
  console.error("Usage: validate-json.ts <json-file-path>");
  process.exit(1);
}

// Validate the JSON file against the schema
validateJson(jsonFilePath);

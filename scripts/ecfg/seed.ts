import { parseArgs } from "node:util";
import readJson from "../utils/readJson";
import { edgeConfigSchema } from "@/server/ecfg/config";
import { EDGE_CONFIG_KEY_PATTERN } from "@/server/ecfg/remote";
import { type SeedPlan, seedEdgeConfig } from "@/server/ecfg/seed";

const cliOptions = {
  config: {
    type: "string",
    default: "src/server/ecfg/config.json",
  },
  apply: {
    type: "boolean",
    default: false,
  },
  "team-id": {
    type: "string",
  },
} as const;

function printUsage(): void {
  console.error(
    "Usage: bun run scripts/ecfg/seed.ts [--config <path>] [--apply] [--team-id <id>]",
  );
  console.error("Required environment variables:");
  console.error("  VERCEL_TOKEN: Vercel access token");
  console.error(
    "  VERCEL_EDGE_CONFIG_ID: Edge Config ID (must start with 'ecfg_')",
  );
  console.error("Optional environment variables:");
  console.error("  VERCEL_TEAM_ID: Vercel team ID");
}

function printKeyList(label: string, keys: string[]): void {
  console.log(label);
  if (keys.length === 0) {
    console.log("  (none)");
  } else {
    for (const key of keys) {
      console.log(`  ${key}`);
    }
  }
}

function printPlan(plan: SeedPlan): void {
  console.log("create:");
  if (plan.create.length === 0) {
    console.log("  (none)");
  } else {
    for (const op of plan.create) {
      console.log(`  ${op.key}`);
    }
  }

  printKeyList("keep (store wins):", plan.keepExisting);
  printKeyList(
    "drift (store differs from config.json, left untouched):",
    plan.drifted,
  );
  printKeyList("remote-only (left untouched):", plan.remoteOnly);
}

async function main(): Promise<void> {
  let parsed: ReturnType<
    typeof parseArgs<{ options: typeof cliOptions; strict: true }>
  >;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options: cliOptions,
      strict: true,
    });
  } catch (err) {
    console.error(
      "Invalid arguments:",
      err instanceof Error ? err.message : String(err),
    );
    printUsage();
    process.exit(1);
  }

  const token = process.env.VERCEL_TOKEN;
  const edgeConfigId = process.env.VERCEL_EDGE_CONFIG_ID;
  const teamId = parsed.values["team-id"] ?? process.env.VERCEL_TEAM_ID;
  const configPath = parsed.values.config ?? "src/server/ecfg/config.json";
  const apply = Boolean(parsed.values.apply);

  if (!token || !edgeConfigId?.startsWith("ecfg_")) {
    printUsage();
    process.exit(1);
  }

  // 2. Read local JSON and validate against edgeConfigSchema
  let localRaw: unknown;
  try {
    localRaw = readJson<unknown>(configPath);
  } catch (err) {
    console.error(
      `Failed to read config file at "${configPath}":`,
      err instanceof Error ? err.message : String(err),
    );
    process.exit(1);
  }

  const parseResult = edgeConfigSchema.safeParse(localRaw);
  if (!parseResult.success) {
    console.error(
      "Configuration schema validation failed:",
      parseResult.error.message,
    );
    process.exit(1);
  }

  const local = localRaw as Record<string, unknown>;

  // 3. Check every top-level local key against EDGE_CONFIG_KEY_PATTERN
  for (const key of Object.keys(local)) {
    if (!EDGE_CONFIG_KEY_PATTERN.test(key)) {
      console.error(
        `Invalid Edge Config key: "${key}" does not match pattern ${EDGE_CONFIG_KEY_PATTERN.source}`,
      );
      process.exit(1);
    }
  }

  // 4-11. Seed orchestration
  try {
    const result = await seedEdgeConfig({
      local,
      target: {
        token,
        edgeConfigId,
        teamId,
      },
      apply,
      onPlan: (plan) => {
        printPlan(plan);
      },
    });

    if (result.mode === "up-to-date") {
      console.log("up to date");
      process.exit(0);
    }

    if (result.mode === "dry-run") {
      console.log("dry run: nothing written");
      process.exit(0);
    }

    if (result.mode === "applied") {
      console.log(`applied: ${result.create.length} key(s) created`);
      process.exit(0);
    }
  } catch (err) {
    console.error(
      "Seed failed:",
      err instanceof Error ? err.message : String(err),
    );
    process.exit(1);
  }
}

void main();

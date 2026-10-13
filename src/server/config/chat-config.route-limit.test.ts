import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { MODERATION_JUDGE_TIMEOUT_MAX_MS } from "./chat-config";

describe("chat config route limit guard", () => {
  it("ensures the tRPC route limit in vercel.json accommodates the maximum judge timeout plus margin", () => {
    const vercelJsonPath = path.join(process.cwd(), "vercel.json");
    const vercelConfig = JSON.parse(
      fs.readFileSync(vercelJsonPath, "utf-8"),
    ) as {
      functions: Record<string, { maxDuration: number }>;
    };
    const maxDurationSec =
      vercelConfig.functions["src/app/api/trpc/[trpc]/route.ts"]?.maxDuration;
    expect(maxDurationSec).toBeDefined();
    expect(maxDurationSec! * 1000).toBeGreaterThanOrEqual(
      MODERATION_JUDGE_TIMEOUT_MAX_MS + 10_000,
    );
  });
});

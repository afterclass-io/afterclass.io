import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { DEFAULT_LLM_BASE_URL } from "@/server/assistant/providers";
import { DEFAULT_CHAT_CONFIG_VALUES } from "@/server/config/chat-config";

// Some tunables must be literals in their own file (Next reads `maxDuration`
// by static analysis, the client bundle cannot import server config). Each
// literal mirrors a default in chat-config.ts. This test fails when one drifts.

function readLiteral(relativePath: string, pattern: RegExp): string {
  const source = readFileSync(
    path.resolve(process.cwd(), relativePath),
    "utf8",
  );
  const match = pattern.exec(source);
  expect(match, `${relativePath} must match ${String(pattern)}`).not.toBeNull();
  return match![1]!;
}

describe("mirrored tunables", () => {
  it("keeps the chat route maxDuration equal to chatMaxDurationSec", () => {
    const literal = readLiteral(
      "src/app/api/chat/route.ts",
      /export const maxDuration = (\d+);/,
    );
    expect(Number(literal)).toBe(DEFAULT_CHAT_CONFIG_VALUES.chatMaxDurationSec);
  });

  it("keeps the month timezone equal to appTimezone", () => {
    const literal = readLiteral(
      "src/server/assistant/month.ts",
      /const TZ = "([^"]+)";/,
    );
    expect(literal).toBe(DEFAULT_CHAT_CONFIG_VALUES.appTimezone);
  });

  it("keeps the provider base URL equal to llmBaseUrl", () => {
    expect(DEFAULT_LLM_BASE_URL).toBe(DEFAULT_CHAT_CONFIG_VALUES.llmBaseUrl);
  });

  it("keeps the bid dialog limit equal to maxBidAmount", () => {
    const literal = readLiteral(
      "src/modules/timetable/components/BidDialogForm.tsx",
      /\.max\((\d+),/,
    );
    expect(Number(literal)).toBe(DEFAULT_CHAT_CONFIG_VALUES.maxBidAmount);
  });
});

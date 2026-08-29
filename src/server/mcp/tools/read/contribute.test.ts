import { describe, expect, it } from "vitest";
import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { getContributeInfoTool } from "./contribute";

const fakeUser: SessionUser = {
  id: "u1", email: "a@smu.edu.sg", username: "u1", isVerified: true,
  universityId: 1, firstName: null, lastName: null, telegramId: null,
  photoUrl: null, facultyId: null, createdAt: new Date(), updatedAt: new Date(),
};

describe("get-contribute-info", () => {
  it("returns absolute contribute/contact links", async () => {
    const ctx = { user: fakeUser, caller: {} } as unknown as ToolContext;
    const result = await getContributeInfoTool.run(ctx, {});
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0]!.text) as Record<string, string>;
    expect(parsed.github).toMatch(/^https?:\/\//);
    expect(parsed.helpdesk).toMatch(/^https?:\/\//);
    expect(parsed.telegramChannel).toMatch(/^https?:\/\//);
    expect(parsed.writeAReview).toContain("/submit");
  });
});

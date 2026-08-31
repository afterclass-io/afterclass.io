import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserPlatform } from "./forgotPwdFormAction";
import { ForgotPwdFormActionReturnType } from "../types";

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@/server/db", () => ({ db: { users: { findUnique } } }));

beforeEach(() => vi.clearAllMocks());

describe("getUserPlatform", () => {
  it("looks the user up by email", async () => {
    findUnique.mockResolvedValue(null);
    await getUserPlatform({ email: "a@smu.edu.sg" });
    expect(findUnique).toHaveBeenCalledWith({
      where: { email: "a@smu.edu.sg" },
    });
  });

  it("returns USER_NOT_FOUND when no row matches", async () => {
    findUnique.mockResolvedValue(null);
    expect(await getUserPlatform({ email: "nobody@smu.edu.sg" })).toBe(
      ForgotPwdFormActionReturnType.USER_NOT_FOUND,
    );
  });

  it("returns USER_ON_V1 when the row still has a legacy password digest", async () => {
    findUnique.mockResolvedValue({ deprecatedPasswordDigest: "legacy-hash" });
    expect(await getUserPlatform({ email: "v1@smu.edu.sg" })).toBe(
      ForgotPwdFormActionReturnType.USER_ON_V1,
    );
  });

  it("returns USER_ON_V2 for a migrated user", async () => {
    findUnique.mockResolvedValue({ deprecatedPasswordDigest: null });
    expect(await getUserPlatform({ email: "v2@smu.edu.sg" })).toBe(
      ForgotPwdFormActionReturnType.USER_ON_V2,
    );
  });
});

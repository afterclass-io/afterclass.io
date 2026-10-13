import { describe, expect, it, vi } from "vitest";

const { authMock, signInMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  signInMock: vi.fn(),
}));

vi.mock("@/server/auth", () => ({
  auth: authMock,
  signIn: signInMock,
}));

vi.mock("@/common/tools/trpc/server", () => ({
  api: {
    labels: {
      getAll: vi.fn().mockResolvedValue([]),
    },
  },
}));

import SubmitReviewPage from "./page";

describe("SubmitReviewPage", () => {
  it("calls signIn with redirectTo /submit when session is null", async () => {
    authMock.mockResolvedValue(null);
    signInMock.mockResolvedValue(undefined);

    await SubmitReviewPage();

    expect(signInMock).toHaveBeenCalledWith(undefined, {
      redirectTo: "/submit",
    });
  });
});

import { describe, expect, it } from "vitest";

import {
  hashConfirmArgs,
  mintConfirmToken,
  verifyConfirmToken,
} from "./confirm-token";

describe("confirm tokens", () => {
  it("verifies a fresh token for the same user+tool+args", async () => {
    const t = await mintConfirmToken({
      userId: "u1",
      tool: "save-bids",
      argHash: "abc",
      secret: "s",
    });
    expect(
      await verifyConfirmToken(t, {
        userId: "u1",
        tool: "save-bids",
        argHash: "abc",
        secret: "s",
      }),
    ).toBe(true);
  });

  it("rejects wrong user, wrong tool, tampered args, and expired tokens", async () => {
    const t = await mintConfirmToken({
      userId: "u1",
      tool: "save-bids",
      argHash: "abc",
      secret: "s",
      ttlMs: 1,
    });
    await new Promise((r) => setTimeout(r, 5));
    expect(
      await verifyConfirmToken(t, {
        userId: "u1",
        tool: "save-bids",
        argHash: "abc",
        secret: "s",
      }),
    ).toBe(false);
    const t2 = await mintConfirmToken({
      userId: "u1",
      tool: "save-bids",
      argHash: "abc",
      secret: "s",
    });
    expect(
      await verifyConfirmToken(t2, {
        userId: "u2",
        tool: "save-bids",
        argHash: "abc",
        secret: "s",
      }),
    ).toBe(false);
    expect(
      await verifyConfirmToken(t2, {
        userId: "u1",
        tool: "remove-bid",
        argHash: "abc",
        secret: "s",
      }),
    ).toBe(false);
    expect(
      await verifyConfirmToken(t2, {
        userId: "u1",
        tool: "save-bids",
        argHash: "tampered",
        secret: "s",
      }),
    ).toBe(false);
  });

  it("rejects malformed tokens without throwing", async () => {
    expect(
      await verifyConfirmToken("not-a-token", {
        userId: "u1",
        tool: "save-bids",
        argHash: "abc",
        secret: "s",
      }),
    ).toBe(false);
    expect(
      await verifyConfirmToken("", {
        userId: "u1",
        tool: "save-bids",
        argHash: "abc",
        secret: "s",
      }),
    ).toBe(false);
  });

  it("hashConfirmArgs is deterministic per args shape", () => {
    expect(hashConfirmArgs({ a: 1 })).toBe(hashConfirmArgs({ a: 1 }));
    expect(hashConfirmArgs({ a: 1 })).not.toBe(hashConfirmArgs({ a: 2 }));
  });
});

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// #522: avatars must go through next/image's optimizer (modern format, fixed
// intrinsic size) instead of the identity provider's unconstrained original,
// while Radix keeps driving the fallback initials. Source-reading, same as
// src/common/perf/perf-invariants.test.ts.

describe("avatar image optimisation (#522)", () => {
  const avatarSrc = fs.readFileSync(
    path.resolve(import.meta.dirname, "./avatar.tsx"),
    "utf-8",
  );

  it("routes AvatarImage through next/image's getImageProps", () => {
    expect(avatarSrc).toContain('import { getImageProps } from "next/image"');
    expect(avatarSrc).toContain("getImageProps(");
  });

  it("requests a fixed intrinsic size instead of the unconstrained original", () => {
    expect(avatarSrc).toMatch(/width:\s*AVATAR_INTRINSIC_SIZE/);
    expect(avatarSrc).toMatch(/height:\s*AVATAR_INTRINSIC_SIZE/);
  });

  it("does not hand the raw remote URL straight to the img", () => {
    // The img src must come from the optimizer, not from the caller's src.
    expect(avatarSrc).toContain("src={optimized?.src}");
  });

  it("serves a single optimized request (no srcSet) so Radix's preload is the only fetch", () => {
    // Radix preloads `src` with a bare `new Image()`; a srcSet would make the
    // rendered img request a second candidate.
    expect(avatarSrc).not.toContain("srcSet=");
  });

  it("keeps the fallback initials path intact", () => {
    const userProfileSrc = fs.readFileSync(
      path.resolve(import.meta.dirname, "./user-profile.tsx"),
      "utf-8",
    );
    expect(userProfileSrc).toContain("<AvatarImage");
    expect(userProfileSrc).toContain("<AvatarFallback");
  });
});

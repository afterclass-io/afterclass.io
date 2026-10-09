import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, inject, it, vi } from "vitest";

// Point db at the Testcontainers database.
vi.mock("@/server/db", async () => {
  const { idb } = await import("@/server/api/integration-test-helpers");
  return { db: idb, txDb: idb };
});

const { linkMock } = vi.hoisted(() => ({
  linkMock: vi.fn(),
}));

vi.mock("./supabase-link", () => ({
  exchangeGoogleIdToken: linkMock,
}));

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: vi.fn(),
}));

import {
  idb as db,
  randBoss,
  seedCourse,
  seedReview,
  seedUser,
} from "@/server/api/integration-test-helpers";
import { authConfig } from "./config";

// eslint-disable-next-line @typescript-eslint/unbound-method -- the callback is a plain function that does not use this
const jwt = authConfig.callbacks.jwt;

function googleParams(email: string, over: Record<string, unknown> = {}) {
  return {
    token: { sub: "provider-sub" },
    user: { email },
    account: { provider: "google", id_token: "google-id-token" },
    profile: { email, picture: "https://pic" },
    trigger: "signIn",
    ...over,
  } as unknown as Parameters<NonNullable<typeof jwt>>[0];
}

const acadTermId = inject("acadTermId");

describe("google jwt reconcile against Postgres (integration)", () => {
  beforeEach(() => {
    linkMock.mockReset();
  });

  it("reconciles supabaseUserId without mutating Users.id when user owns reviews, bids and timetables", async () => {
    const user = await seedUser(db);
    const course = await seedCourse(db);

    const review = await seedReview(db, {
      reviewerId: user.id,
      courseId: course.id,
    });

    const classRow = await db.classes.create({
      data: {
        section: "G1",
        courseId: course.id,
        acadTermId,
        bossId: randBoss(),
      },
    });

    const bidWindow = await db.bidWindow.create({
      data: {
        acadTermId,
        round: "1",
        window: 1,
        resultsAt: new Date("2024-09-01"),
      },
    });

    const userBid = await db.userBid.create({
      data: {
        userId: user.id,
        classId: classRow.id,
        bidWindowId: bidWindow.id,
        bidAmount: 25,
      },
    });

    const userTimetable = await db.userTimetable.create({
      data: {
        userId: user.id,
        acadTermId,
        name: "My Plan",
      },
    });

    const supaId = `supa-${randomUUID()}`;
    linkMock.mockResolvedValue({
      accessToken: "supa-access-token",
      refreshToken: "supa-refresh-token",
      expiresAt: 9999999999,
      supabaseUserId: supaId,
    });

    const token = await jwt(googleParams(user.email));

    // Assert: no throw, token has original Users.id in sub
    expect(token).toBeDefined();
    expect(token?.sub).toBe(user.id);
    expect(token?.supabaseAccessToken).toBe("supa-access-token");
    expect(token?.googleLinkFailed).toBe(false);

    // Assert: DB row keeps its id and has supabaseUserId set
    const refreshedUser = await db.users.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(refreshedUser.id).toBe(user.id);
    expect(refreshedUser.supabaseUserId).toBe(supaId);

    // Assert: child foreign keys (NO ACTION) still point at the original id
    const refreshedReview = await db.reviews.findUniqueOrThrow({
      where: { id: review.id },
    });
    expect(refreshedReview.reviewerId).toBe(user.id);

    const refreshedBid = await db.userBid.findUniqueOrThrow({
      where: { id: userBid.id },
    });
    expect(refreshedBid.userId).toBe(user.id);

    const refreshedTimetable = await db.userTimetable.findUniqueOrThrow({
      where: { id: userTimetable.id },
    });
    expect(refreshedTimetable.userId).toBe(user.id);
  });

  it("keeps no Supabase tokens and performs no row changes when another user owns the Supabase id", async () => {
    const clashSupaId = `clash-${randomUUID()}`;
    const clashingUser = await db.users.create({
      data: {
        id: clashSupaId,
        email: `clash-${randomUUID()}@example.edu`,
        username: `clash-${randomUUID()}`,
        universityId: inject("universityId"),
      },
    });

    const user2 = await seedUser(db);
    linkMock.mockResolvedValue({
      accessToken: "clash-access-token",
      refreshToken: "clash-refresh-token",
      expiresAt: 9999999999,
      supabaseUserId: clashSupaId,
    });

    const token2 = await jwt(googleParams(user2.email));

    expect(token2).toBeDefined();
    expect(token2?.sub).toBe(user2.id);
    expect(token2?.supabaseAccessToken).toBeNull();
    expect(token2?.supabaseRefreshToken).toBeNull();
    expect(token2?.supabaseExpiresAt).toBeNull();

    // Assert: neither row was modified
    const refreshedUser2 = await db.users.findUniqueOrThrow({
      where: { id: user2.id },
    });
    expect(refreshedUser2.id).toBe(user2.id);
    expect(refreshedUser2.supabaseUserId).toBeNull();

    const refreshedClashing = await db.users.findUniqueOrThrow({
      where: { id: clashingUser.id },
    });
    expect(refreshedClashing.id).toBe(clashSupaId);
    expect(refreshedClashing.supabaseUserId).toBeNull();
  });
});

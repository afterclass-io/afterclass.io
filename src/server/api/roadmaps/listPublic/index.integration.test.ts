import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, inject, it } from "vitest";

import { Visibility } from "@prisma/client";
import { idb as db, seedUser } from "@/server/api/integration-test-helpers";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";

import { listPublic } from "./index";

const router = createTRPCRouter({ listPublic });
const facultyId = inject("facultyId");

describe("roadmaps.listPublic pagination (integration)", () => {
  const caller = makeCaller(router.createCaller, db, null);
  let tag: string;
  let roadmapsNewest: { id: string; name: string }[];

  beforeAll(async () => {
    const owner = await seedUser(db);
    tag = `pub-page-${randomUUID().slice(0, 8)}`;

    // Create 5 public roadmaps with descending published dates
    const dates = [
      new Date("2024-05-01T00:00:00Z"),
      new Date("2024-04-01T00:00:00Z"),
      new Date("2024-03-01T00:00:00Z"),
      new Date("2024-02-01T00:00:00Z"),
      new Date("2024-01-01T00:00:00Z"),
    ];

    roadmapsNewest = [];
    for (let i = 0; i < dates.length; i++) {
      const rm = await db.userRoadmap.create({
        data: {
          userId: owner.id,
          name: `${tag} Roadmap ${i + 1}`,
          description: `Description for ${tag} ${i + 1}`,
          visibility: Visibility.PUBLIC,
          publishedAt: dates[i],
          facultyId,
        },
      });
      roadmapsNewest.push({ id: rm.id, name: rm.name });
    }

    // Also seed a private roadmap and an unpublished roadmap with the same tag;
    // neither should appear in public gallery pagination.
    await db.userRoadmap.create({
      data: {
        userId: owner.id,
        name: `${tag} Private Roadmap`,
        visibility: Visibility.PRIVATE,
        publishedAt: new Date("2024-06-01T00:00:00Z"),
      },
    });
    await db.userRoadmap.create({
      data: {
        userId: owner.id,
        name: `${tag} Unpublished Roadmap`,
        visibility: Visibility.PUBLIC,
        publishedAt: null,
      },
    });
  });

  it("paginates sequentially across all items without skipping or duplicating records", async () => {
    // Page 1: limit = 2
    const page1 = await caller.listPublic({
      query: tag,
      limit: 2,
      sort: "newest",
    });

    expect(page1.items).toHaveLength(2);
    expect(page1.items[0]!.roadmap.id).toBe(roadmapsNewest[0]!.id);
    expect(page1.items[1]!.roadmap.id).toBe(roadmapsNewest[1]!.id);
    // Crucial: nextCursor must point to the LAST item of page 1, not the popped lookahead item.
    expect(page1.nextCursor).toBe(roadmapsNewest[1]!.id);

    // Page 2: limit = 2, cursor = page1.nextCursor
    const page2 = await caller.listPublic({
      query: tag,
      limit: 2,
      cursor: page1.nextCursor!,
      sort: "newest",
    });

    expect(page2.items).toHaveLength(2);
    // Verifies the 3rd item was NOT skipped by cursor + skip: 1
    expect(page2.items[0]!.roadmap.id).toBe(roadmapsNewest[2]!.id);
    expect(page2.items[1]!.roadmap.id).toBe(roadmapsNewest[3]!.id);
    expect(page2.nextCursor).toBe(roadmapsNewest[3]!.id);

    // Page 3: limit = 2, cursor = page2.nextCursor
    const page3 = await caller.listPublic({
      query: tag,
      limit: 2,
      cursor: page2.nextCursor!,
      sort: "newest",
    });

    expect(page3.items).toHaveLength(1);
    expect(page3.items[0]!.roadmap.id).toBe(roadmapsNewest[4]!.id);
    // When remaining items <= limit, nextCursor is null
    expect(page3.nextCursor).toBeNull();

    // Verify complete sequence matches 1:1 with 0 duplicates and 0 omissions
    const allFetchedIds = [
      ...page1.items.map((it) => it.roadmap.id),
      ...page2.items.map((it) => it.roadmap.id),
      ...page3.items.map((it) => it.roadmap.id),
    ];
    expect(allFetchedIds).toEqual(roadmapsNewest.map((r) => r.id));
  });

  it("paginates properly with secondary sort (most-liked)", async () => {
    const owner = await seedUser(db);
    const likedTag = `liked-page-${randomUUID().slice(0, 8)}`;

    const r1 = await db.userRoadmap.create({
      data: {
        userId: owner.id,
        name: `${likedTag} High Likes`,
        visibility: Visibility.PUBLIC,
        publishedAt: new Date("2024-01-01T00:00:00Z"),
        upvoteCount: 50,
      },
    });
    const r2 = await db.userRoadmap.create({
      data: {
        userId: owner.id,
        name: `${likedTag} Medium Likes`,
        visibility: Visibility.PUBLIC,
        publishedAt: new Date("2024-01-01T00:00:00Z"),
        upvoteCount: 20,
      },
    });
    const r3 = await db.userRoadmap.create({
      data: {
        userId: owner.id,
        name: `${likedTag} Low Likes`,
        visibility: Visibility.PUBLIC,
        publishedAt: new Date("2024-01-01T00:00:00Z"),
        upvoteCount: 5,
      },
    });

    const page1 = await caller.listPublic({
      query: likedTag,
      limit: 2,
      sort: "most-liked",
    });
    expect(page1.items).toHaveLength(2);
    expect(page1.items[0]!.roadmap.id).toBe(r1.id);
    expect(page1.items[1]!.roadmap.id).toBe(r2.id);
    expect(page1.nextCursor).toBe(r2.id);

    const page2 = await caller.listPublic({
      query: likedTag,
      limit: 2,
      cursor: page1.nextCursor!,
      sort: "most-liked",
    });
    expect(page2.items).toHaveLength(1);
    expect(page2.items[0]!.roadmap.id).toBe(r3.id);
    expect(page2.nextCursor).toBeNull();
  });

  it("filters by facultyId alongside pagination", async () => {
    const page = await caller.listPublic({
      query: tag,
      facultyId,
      limit: 10,
    });

    expect(page.items).toHaveLength(5);
    for (const item of page.items) {
      expect(item.faculty).not.toBeNull();
      expect(item.faculty!.id).toBe(facultyId);
    }
  });
});

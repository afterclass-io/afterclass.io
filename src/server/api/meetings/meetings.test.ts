import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockCheckAndIncrement, mockGetCurrentAcadTerm } = vi.hoisted(() => ({
  mockCheckAndIncrement: vi.fn(),
  mockGetCurrentAcadTerm: vi.fn(),
}));

vi.mock("@/server/assistant/ratelimit", () => ({
  checkAndIncrement: mockCheckAndIncrement,
}));

vi.mock("@/common/tools/acad-term", () => ({
  getCurrentAcadTerm: mockGetCurrentAcadTerm,
}));

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { meetingsRouter } from "./router";

const CREATOR_ID = "00000000-0000-4000-a000-000000000001";
const PARTICIPANT_USER_ID_1 = "00000000-0000-4000-a000-000000000002";
const PARTICIPANT_USER_ID_2 = "00000000-0000-4000-a000-000000000003";
const COURSE_ID = "00000000-0000-4000-a000-0000000000c1";

const CURRENT_TERM = {
  id: "AY202627T1",
  label: "AY2026/27 T1",
  startDt: new Date("2026-08-17T00:00:00.000Z"),
  endDt: new Date("2026-12-06T23:59:59.999Z"),
};

describe("meetingsRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckAndIncrement.mockResolvedValue({
      ok: true,
      retryAfterSeconds: 0,
    });
    mockGetCurrentAcadTerm.mockResolvedValue(CURRENT_TERM);
  });

  describe("createPoll", () => {
    const baseInput = {
      title: "CS201 Project Sync",
      description: "Weekly sync meeting",
      startDate: "2026-10-10",
      endDate: "2026-10-17",
      startHour: 9,
      endHour: 18,
    };

    function callerWith(db: Record<string, unknown>) {
      return makeCaller(meetingsRouter.createCaller, db, {
        user: { id: CREATOR_ID },
      });
    }

    it("creates a poll scoped to the current term and returns slug and id", async () => {
      const createMock = vi
        .fn()
        .mockResolvedValue({ id: "poll-uuid-1", slug: "abc1234567" });
      const caller = callerWith({ meetingPoll: { create: createMock } });

      const result = await caller.createPoll(baseInput);

      expect(result).toEqual({ slug: "abc1234567", id: "poll-uuid-1" });
      const createArgs = createMock.mock.calls[0]?.[0] as {
        data: Record<string, unknown>;
      };
      expect(createArgs.data).toMatchObject({
        title: "CS201 Project Sync",
        creatorId: CREATOR_ID,
        startHour: 9,
        endHour: 18,
        courseId: null,
        section: null,
        acadTermId: "AY202627T1",
      });
    });

    it("accepts null course and section (no class) as well as omitted ones", async () => {
      const createMock = vi
        .fn()
        .mockResolvedValue({ id: "poll-uuid-1", slug: "abc1234567" });
      const caller = callerWith({ meetingPoll: { create: createMock } });

      await expect(
        caller.createPoll({ ...baseInput, courseId: null, section: null }),
      ).resolves.toBeDefined();
      await expect(caller.createPoll(baseInput)).resolves.toBeDefined();
    });

    it("rejects an empty-string courseId before touching the database (UUID regression)", async () => {
      const createMock = vi.fn();
      const caller = callerWith({ meetingPoll: { create: createMock } });

      await expect(
        caller.createPoll({ ...baseInput, courseId: "", section: "" }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(createMock).not.toHaveBeenCalled();
    });

    it("rejects a course without a section and a section without a course", async () => {
      const caller = callerWith({});

      await expect(
        caller.createPoll({ ...baseInput, courseId: COURSE_ID }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(
        caller.createPoll({ ...baseInput, section: "G1" }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("creates a poll for a class that is offered in the current term", async () => {
      const findClassMock = vi.fn().mockResolvedValue({ id: "class-1" });
      const createMock = vi
        .fn()
        .mockResolvedValue({ id: "poll-uuid-1", slug: "abc1234567" });
      const caller = callerWith({
        classes: { findFirst: findClassMock },
        meetingPoll: { create: createMock },
      });

      await caller.createPoll({
        ...baseInput,
        courseId: COURSE_ID,
        section: "G1",
        teamIdentifier: "Team 3",
      });

      expect(findClassMock).toHaveBeenCalledWith({
        where: { courseId: COURSE_ID, section: "G1", acadTermId: "AY202627T1" },
        select: { id: true },
      });
      const createArgs = createMock.mock.calls[0]?.[0] as {
        data: Record<string, unknown>;
      };
      expect(createArgs.data).toMatchObject({
        courseId: COURSE_ID,
        section: "G1",
        teamIdentifier: "Team 3",
      });
    });

    it("rejects a class that is not offered in the current term", async () => {
      const createMock = vi.fn();
      const caller = callerWith({
        classes: { findFirst: vi.fn().mockResolvedValue(null) },
        meetingPoll: { create: createMock },
      });

      const attempt = caller.createPoll({
        ...baseInput,
        courseId: COURSE_ID,
        section: "G9",
      });
      await expect(attempt).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(attempt).rejects.toThrow(/not offered in the current term/);
      expect(createMock).not.toHaveBeenCalled();
    });

    it("rejects dates that start before the term", async () => {
      const caller = callerWith({});

      const attempt = caller.createPoll({
        ...baseInput,
        startDate: "2026-08-10",
        endDate: "2026-08-14",
      });
      await expect(attempt).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(attempt).rejects.toThrow(/current term/);
    });

    it("rejects dates that end after the term", async () => {
      const caller = callerWith({});

      await expect(
        caller.createPoll({
          ...baseInput,
          startDate: "2026-12-04",
          endDate: "2026-12-09",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("rejects when there is no current term", async () => {
      mockGetCurrentAcadTerm.mockResolvedValueOnce(null);
      const caller = callerWith({});

      await expect(caller.createPoll(baseInput)).rejects.toMatchObject({
        code: "PRECONDITION_FAILED",
      });
    });

    it("rejects date range exceeding 14 days with BAD_REQUEST", async () => {
      const caller = callerWith({});

      const attempt = caller.createPoll({
        ...baseInput,
        startDate: "2026-10-01",
        endDate: "2026-10-20",
      });
      await expect(attempt).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(attempt).rejects.toThrow(/14 days/);
    });

    it("rejects when startDate is after endDate with BAD_REQUEST", async () => {
      const caller = callerWith({});

      await expect(
        caller.createPoll({
          ...baseInput,
          startDate: "2026-10-20",
          endDate: "2026-10-10",
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Start date must be before or equal to end date",
      });
    });

    it("rejects when startHour >= endHour with BAD_REQUEST", async () => {
      const caller = callerWith({});

      await expect(
        caller.createPoll({ ...baseInput, startHour: 18, endHour: 12 }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Start hour must be earlier than end hour",
      });
    });

    it("enforces rate limit and rejects with TOO_MANY_REQUESTS", async () => {
      mockCheckAndIncrement.mockResolvedValueOnce({
        ok: false,
        retryAfterSeconds: 3600,
      });
      const caller = callerWith({});

      await expect(caller.createPoll(baseInput)).rejects.toMatchObject({
        code: "TOO_MANY_REQUESTS",
      });
    });

    it("throws UNAUTHORIZED when session is null", async () => {
      const caller = makeCaller(meetingsRouter.createCaller, {}, null);

      await expect(caller.createPoll(baseInput)).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });

  describe("getCreateOptions", () => {
    const course = { id: COURSE_ID, code: "IS215", name: "Digital Business" };

    it("returns the current term and de-duplicated class options", async () => {
      const findManyMock = vi.fn().mockResolvedValue([
        { section: "G1", course },
        { section: "G1", course },
        { section: "G2", course },
      ]);
      const caller = makeCaller(
        meetingsRouter.createCaller,
        { classes: { findMany: findManyMock } },
        { user: { id: CREATOR_ID } },
      );

      const result = await caller.getCreateOptions();

      expect(result.term?.id).toBe("AY202627T1");
      expect(result.classes).toEqual([
        { courseId: COURSE_ID, code: "IS215", name: "Digital Business", section: "G1" },
        { courseId: COURSE_ID, code: "IS215", name: "Digital Business", section: "G2" },
      ]);
      expect(findManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { acadTermId: "AY202627T1" },
          take: 3000,
        }),
      );
    });

    it("returns no term and no classes when there is no current term", async () => {
      mockGetCurrentAcadTerm.mockResolvedValueOnce(null);
      const caller = makeCaller(
        meetingsRouter.createCaller,
        {},
        { user: { id: CREATOR_ID } },
      );

      await expect(caller.getCreateOptions()).resolves.toEqual({
        term: null,
        classes: [],
      });
    });
  });

  describe("getPollBySlug & Privacy Invariant (Zero Users.id Exposure)", () => {
    const mockPollData = {
      id: "poll-uuid-1",
      slug: "abcdefghij",
      title: "Team Alpha Standup",
      description: "Daily sync",
      agenda: "Plan the sprint",
      links: ["https://meet.google.com/abc"],
      creatorId: CREATOR_ID,
      startDate: new Date("2026-10-10T00:00:00.000Z"),
      endDate: new Date("2026-10-15T00:00:00.000Z"),
      startHour: 9,
      endHour: 18,
      slotDurationMinutes: 15,
      course: { id: "c-1", code: "IS216", name: "Web App Dev" },
      section: "G1",
      teamIdentifier: "Team 3",
      acadTerm: { id: "t-1", acadYearStart: 2026, acadYearEnd: 2027, term: "1" },
      participants: [
        {
          id: "part-uuid-1",
          userId: CREATOR_ID,
          user: { firstName: "Tan", lastName: "Zhong Yan" },
          availableSlots: [0, 1, 2],
          ifNeededSlots: [3, 4],
        },
        {
          id: "part-uuid-2",
          userId: PARTICIPANT_USER_ID_1,
          user: { firstName: "Alice", lastName: "Smith" },
          availableSlots: [1, 2, 5],
          ifNeededSlots: [0],
        },
        {
          id: "part-uuid-3",
          userId: PARTICIPANT_USER_ID_2,
          user: { firstName: null, lastName: null },
          availableSlots: [2, 6],
          ifNeededSlots: [1, 5],
        },
      ],
    };

    it("computes in-memory heatmap, derives live names and flags isCurrentUser", async () => {
      const findUniqueMock = vi.fn().mockResolvedValue(mockPollData);

      const caller = makeCaller(
        meetingsRouter.createCaller,
        {
          meetingPoll: { findUnique: findUniqueMock },
        },
        { user: { id: CREATOR_ID } },
      );

      const result = await caller.getPollBySlug({ slug: "abcdefghij" });

      expect(result.poll.title).toBe("Team Alpha Standup");
      expect(result.poll.course?.code).toBe("IS216");

      // Verify participants mapping
      expect(result.participants).toHaveLength(3);
      expect(result.participants[0]?.participantId).toBe("part-uuid-1");
      expect(result.participants[0]?.name).toBe("Tan Zhong Yan");
      expect(result.participants[1]?.name).toBe("Alice Smith");
      expect(result.participants[2]?.name).toBe("Student");
      expect(result.participants[0]?.isCurrentUser).toBe(true);
      expect(result.participants[1]?.isCurrentUser).toBe(false);
      expect(result.participants[2]?.isCurrentUser).toBe(false);

      // Verify in-memory heatmap aggregation
      // Slot 0: p1 available, p2 ifNeeded -> available 1, ifNeeded 1
      expect(result.heatmap[0]).toEqual({ availableCount: 1, ifNeededCount: 1 });
      // Slot 1: p1 available, p2 available, p3 ifNeeded -> available 2, ifNeeded 1
      expect(result.heatmap[1]).toEqual({ availableCount: 2, ifNeededCount: 1 });
      // Slot 2: p1 available, p2 available, p3 available -> available 3, ifNeeded 0
      expect(result.heatmap[2]).toEqual({ availableCount: 3, ifNeededCount: 0 });
    });

    it("STRICT PRIVACY INVARIANT: Verifies zero Users.id exposure in responses (neither creator nor peers)", async () => {
      const findUniqueMock = vi.fn().mockResolvedValue(mockPollData);

      const caller = makeCaller(
        meetingsRouter.createCaller,
        {
          meetingPoll: { findUnique: findUniqueMock },
        },
        { user: { id: PARTICIPANT_USER_ID_1 } },
      );

      const result = await caller.getPollBySlug({ slug: "abcdefghij" });
      const serialized = JSON.stringify(result);

      // 1. None of the actual user IDs must appear anywhere in the serialized payload
      expect(serialized).not.toContain(CREATOR_ID);
      expect(serialized).not.toContain(PARTICIPANT_USER_ID_1);
      expect(serialized).not.toContain(PARTICIPANT_USER_ID_2);

      // 2. Field names creatorId and userId must NOT be present
      expect(serialized).not.toContain('"creatorId"');
      expect(serialized).not.toContain('"userId"');

      // 3. Verify participants have participantId (meeting_participants UUID) and not userId
      for (const p of result.participants) {
        expect(p).toHaveProperty("participantId");
        expect(p).not.toHaveProperty("userId");
      }

      // 4. Verify poll never carries creatorId
      expect(result.poll).not.toHaveProperty("creatorId");
    });

    it("works correctly for unauthenticated callers (session null)", async () => {
      const findUniqueMock = vi.fn().mockResolvedValue(mockPollData);

      const caller = makeCaller(
        meetingsRouter.createCaller,
        {
          meetingPoll: { findUnique: findUniqueMock },
        },
        null,
      );

      const result = await caller.getPollBySlug({ slug: "abcdefghij" });

      expect(result.participants.every((p) => p.isCurrentUser === false)).toBe(true);
      expect(result.heatmap[2]?.availableCount).toBe(3);
    });

    it("rejects a new responder once the poll has 10 participants", async () => {
      const upsertMock = vi.fn();
      const caller = makeCaller(
        meetingsRouter.createCaller,
        {
          meetingPoll: {
            findUnique: vi.fn().mockResolvedValue({ id: "poll-uuid-1" }),
          },
          meetingParticipant: {
            findUnique: vi.fn().mockResolvedValue(null),
            count: vi.fn().mockResolvedValue(10),
            upsert: upsertMock,
          },
        },
        { user: { id: CREATOR_ID } },
      );

      await expect(
        caller.submitAvailability({
          slug: "abcdefghij",
          availableSlots: [1],
          ifNeededSlots: [],
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(upsertMock).not.toHaveBeenCalled();
    });

    it("throws NOT_FOUND if poll does not exist", async () => {
      const findUniqueMock = vi.fn().mockResolvedValue(null);

      const caller = makeCaller(
        meetingsRouter.createCaller,
        {
          meetingPoll: { findUnique: findUniqueMock },
        },
        null,
      );

      await expect(
        caller.getPollBySlug({ slug: "nonexistent" }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("joinPoll", () => {
    it("adds the viewer as an empty participant without touching existing slots", async () => {
      const upsertMock = vi.fn().mockResolvedValue({ id: "part-1" });
      const caller = makeCaller(
        meetingsRouter.createCaller,
        {
          meetingPoll: {
            findUnique: vi.fn().mockResolvedValue({ id: "poll-uuid-1" }),
          },
          meetingParticipant: {
            findUnique: vi.fn().mockResolvedValue(null),
            count: vi.fn().mockResolvedValue(0),
            upsert: upsertMock,
          },
        },
        { user: { id: PARTICIPANT_USER_ID_1 } },
      );

      await expect(caller.joinPoll({ slug: "abcdefghij" })).resolves.toEqual({
        success: true,
      });
      expect(upsertMock).toHaveBeenCalledWith({
        where: {
          pollId_userId: {
            pollId: "poll-uuid-1",
            userId: PARTICIPANT_USER_ID_1,
          },
        },
        update: {},
        create: { pollId: "poll-uuid-1", userId: PARTICIPANT_USER_ID_1 },
      });
    });

    it("rejects a new participant once the poll has 10", async () => {
      const upsertMock = vi.fn();
      const caller = makeCaller(
        meetingsRouter.createCaller,
        {
          meetingPoll: {
            findUnique: vi.fn().mockResolvedValue({ id: "poll-uuid-1" }),
          },
          meetingParticipant: {
            findUnique: vi.fn().mockResolvedValue(null),
            count: vi.fn().mockResolvedValue(10),
            upsert: upsertMock,
          },
        },
        { user: { id: PARTICIPANT_USER_ID_1 } },
      );

      await expect(caller.joinPoll({ slug: "abcdefghij" })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expect(upsertMock).not.toHaveBeenCalled();
    });

    it("lets an existing participant rejoin a full poll", async () => {
      const upsertMock = vi.fn().mockResolvedValue({ id: "part-1" });
      const countMock = vi.fn().mockResolvedValue(10);
      const caller = makeCaller(
        meetingsRouter.createCaller,
        {
          meetingPoll: {
            findUnique: vi.fn().mockResolvedValue({ id: "poll-uuid-1" }),
          },
          meetingParticipant: {
            findUnique: vi.fn().mockResolvedValue({ id: "part-1" }),
            count: countMock,
            upsert: upsertMock,
          },
        },
        { user: { id: PARTICIPANT_USER_ID_1 } },
      );

      await expect(caller.joinPoll({ slug: "abcdefghij" })).resolves.toEqual({
        success: true,
      });
      expect(countMock).not.toHaveBeenCalled();
    });

    it("throws NOT_FOUND for an unknown poll", async () => {
      const caller = makeCaller(
        meetingsRouter.createCaller,
        { meetingPoll: { findUnique: vi.fn().mockResolvedValue(null) } },
        { user: { id: PARTICIPANT_USER_ID_1 } },
      );

      await expect(caller.joinPoll({ slug: "abcdefghij" })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("updatePoll", () => {
    const pollOwnedBy = (creatorId: string) =>
      vi.fn().mockResolvedValue({ id: "poll-uuid-1", creatorId });

    it("lets the creator update agenda and links", async () => {
      const updateMock = vi.fn().mockResolvedValue({});
      const caller = makeCaller(
        meetingsRouter.createCaller,
        {
          meetingPoll: { findUnique: pollOwnedBy(CREATOR_ID), update: updateMock },
        },
        { user: { id: CREATOR_ID } },
      );

      await caller.updatePoll({
        slug: "abcdefghij",
        agenda: "Sprint review",
        links: ["https://meet.google.com/abc"],
      });

      expect(updateMock).toHaveBeenCalledWith({
        where: { id: "poll-uuid-1" },
        data: {
          title: undefined,
          description: undefined,
          agenda: "Sprint review",
          links: ["https://meet.google.com/abc"],
        },
      });
    });

    it("rejects edits from anyone but the creator", async () => {
      const updateMock = vi.fn();
      const caller = makeCaller(
        meetingsRouter.createCaller,
        {
          meetingPoll: { findUnique: pollOwnedBy(CREATOR_ID), update: updateMock },
        },
        { user: { id: PARTICIPANT_USER_ID_1 } },
      );

      await expect(
        caller.updatePoll({ slug: "abcdefghij", agenda: "Hijack" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(updateMock).not.toHaveBeenCalled();
    });

    it("rejects non-http links", async () => {
      const caller = makeCaller(
        meetingsRouter.createCaller,
        { meetingPoll: { findUnique: pollOwnedBy(CREATOR_ID) } },
        { user: { id: CREATOR_ID } },
      );

      await expect(
        caller.updatePoll({ slug: "abcdefghij", links: ["javascript:alert(1)"] }),
      ).rejects.toThrow();
    });
  });

  describe("submitAvailability", () => {
    it("atomically upserts participant slots and returns participantId without leaking userId", async () => {
      const findUniqueMock = vi.fn().mockResolvedValue({ id: "poll-uuid-1" });
      const upsertMock = vi.fn().mockResolvedValue({
        id: "part-uuid-new",
      });

      const caller = makeCaller(
        meetingsRouter.createCaller,
        {
          meetingPoll: { findUnique: findUniqueMock },
          meetingParticipant: {
            findUnique: vi.fn().mockResolvedValue(null),
            count: vi.fn().mockResolvedValue(0),
            upsert: upsertMock,
          },
        },
        { user: { id: CREATOR_ID } },
      );

      const result = await caller.submitAvailability({
        slug: "abcdefghij",
        availableSlots: [1, 2, 3],
        ifNeededSlots: [4, 5],
      });

      expect(result).toEqual({
        participantId: "part-uuid-new",
        success: true,
      });
      expect(result).not.toHaveProperty("userId");

      expect(upsertMock).toHaveBeenCalledWith({
        where: {
          pollId_userId: {
            pollId: "poll-uuid-1",
            userId: CREATOR_ID,
          },
        },
        update: {
          availableSlots: [1, 2, 3],
          ifNeededSlots: [4, 5],
        },
        create: {
          pollId: "poll-uuid-1",
          userId: CREATOR_ID,
          availableSlots: [1, 2, 3],
          ifNeededSlots: [4, 5],
        },
        select: {
          id: true,
        },
      });
    });

    it("throws NOT_FOUND if poll does not exist", async () => {
      const findUniqueMock = vi.fn().mockResolvedValue(null);

      const caller = makeCaller(
        meetingsRouter.createCaller,
        {
          meetingPoll: { findUnique: findUniqueMock },
        },
        { user: { id: CREATOR_ID } },
      );

      await expect(
        caller.submitAvailability({
          slug: "abcdefghij",
          availableSlots: [1, 2],
          ifNeededSlots: [],
        }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("listMyMeetings", () => {
    it("returns meeting polls created or joined by user with zero Users.id exposure", async () => {
      const findManyMock = vi.fn().mockResolvedValue([
        {
          id: "poll-uuid-1",
          slug: "pollslug01",
          title: "Created Poll",
          description: null,
          startDate: new Date("2026-10-10"),
          endDate: new Date("2026-10-15"),
          startHour: 9,
          endHour: 18,
          slotDurationMinutes: 15,
          creatorId: CREATOR_ID,
          course: null,
          section: null,
          teamIdentifier: null,
          acadTerm: null,
          createdAt: new Date("2026-10-01"),
          updatedAt: new Date("2026-10-01"),
          _count: { participants: 4 },
          participants: [{ availableSlots: [1, 2], ifNeededSlots: [] }],
        },
        {
          id: "poll-uuid-2",
          slug: "pollslug02",
          title: "Joined Poll",
          description: "Peer sync",
          startDate: new Date("2026-10-12"),
          endDate: new Date("2026-10-14"),
          startHour: 10,
          endHour: 20,
          slotDurationMinutes: 15,
          creatorId: PARTICIPANT_USER_ID_1,
          course: { id: "c-1", code: "IS216", name: "Web App Dev" },
          section: "G2",
          teamIdentifier: "Team Bravo",
          acadTerm: { id: "t-1", acadYearStart: 2026, acadYearEnd: 2027, term: "1" },
          createdAt: new Date("2026-09-28"),
          updatedAt: new Date("2026-09-28"),
          _count: { participants: 2 },
          participants: [],
        },
      ]);

      const caller = makeCaller(
        meetingsRouter.createCaller,
        {
          meetingPoll: { findMany: findManyMock },
        },
        { user: { id: CREATOR_ID } },
      );

      const result = await caller.listMyMeetings();

      expect(result).toHaveLength(2);

      // Verify creator status flags
      expect(result[0]?.isCreator).toBe(true);
      expect(result[0]?.participantCount).toBe(4);
      expect(result[0]?.hasResponded).toBe(true);
      expect(result[1]?.isCreator).toBe(false);
      expect(result[1]?.participantCount).toBe(2);
      expect(result[1]?.hasResponded).toBe(false);

      expect(findManyMock.mock.calls[0]?.[0]).toMatchObject({
        select: {
          participants: {
            where: { userId: CREATOR_ID },
            take: 1,
          },
        },
      });

      // STRICT PRIVACY INVARIANT: Ensure creatorId and userId are NOT present
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain(CREATOR_ID);
      expect(serialized).not.toContain(PARTICIPANT_USER_ID_1);
      expect(serialized).not.toContain('"creatorId"');
      expect(serialized).not.toContain('"userId"');
      expect(serialized).not.toContain("availableSlots");

      for (const item of result) {
        expect(item).not.toHaveProperty("creatorId");
        expect(item).toHaveProperty("isCreator");
        expect(item).toHaveProperty("participantCount");
      }
    });

    it("treats a participant row with no slots as not responded", async () => {
      const findManyMock = vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: "poll-uuid-1",
            slug: "pollslug01",
            title: "Poll 1",
            description: null,
            startDate: new Date("2026-10-10"),
            endDate: new Date("2026-10-15"),
            startHour: 9,
            endHour: 18,
            slotDurationMinutes: 15,
            creatorId: CREATOR_ID,
            course: null,
            section: null,
            teamIdentifier: null,
            acadTerm: null,
            createdAt: new Date("2026-10-01"),
            updatedAt: new Date("2026-10-01"),
            _count: { participants: 1 },
            participants: [{ availableSlots: [], ifNeededSlots: [] }],
          },
        ])
        .mockResolvedValueOnce([
          {
            id: "poll-uuid-1",
            slug: "pollslug01",
            title: "Poll 1",
            description: null,
            startDate: new Date("2026-10-10"),
            endDate: new Date("2026-10-15"),
            startHour: 9,
            endHour: 18,
            slotDurationMinutes: 15,
            creatorId: CREATOR_ID,
            course: null,
            section: null,
            teamIdentifier: null,
            acadTerm: null,
            createdAt: new Date("2026-10-01"),
            updatedAt: new Date("2026-10-01"),
            _count: { participants: 1 },
            participants: [{ availableSlots: [], ifNeededSlots: [3] }],
          },
        ]);

      const caller = makeCaller(
        meetingsRouter.createCaller,
        {
          meetingPoll: { findMany: findManyMock },
        },
        { user: { id: CREATOR_ID } },
      );

      const res1 = await caller.listMyMeetings();
      expect(res1[0]?.hasResponded).toBe(false);

      const res2 = await caller.listMyMeetings();
      expect(res2[0]?.hasResponded).toBe(true);
    });

    it("throws UNAUTHORIZED when session is null", async () => {
      const caller = makeCaller(meetingsRouter.createCaller, {}, null);

      await expect(caller.listMyMeetings()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });
});

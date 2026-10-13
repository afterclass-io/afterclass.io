import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";

import { assertCalendarLinkAllowed, isTermEnded } from "./ical-expiry";

describe("ical-expiry", () => {
  describe("isTermEnded", () => {
    it("returns true when current time is strictly after term end date", () => {
      const endDt = new Date("2026-10-08T00:00:00Z");
      const now = new Date("2026-10-09T00:00:00Z");
      expect(isTermEnded(endDt, now)).toBe(true);
    });

    it("returns false when current time is before term end date", () => {
      const endDt = new Date("2026-10-10T00:00:00Z");
      const now = new Date("2026-10-09T00:00:00Z");
      expect(isTermEnded(endDt, now)).toBe(false);
    });

    it("returns false when current time equals term end date", () => {
      const endDt = new Date("2026-10-09T00:00:00Z");
      const now = new Date("2026-10-09T00:00:00Z");
      expect(isTermEnded(endDt, now)).toBe(false);
    });
  });

  describe("assertCalendarLinkAllowed", () => {
    it("passes for an unlisted timetable with an ongoing term", () => {
      const timetable = {
        visibility: "UNLISTED",
        acadTerm: { endDt: new Date("2026-12-01T00:00:00Z") },
      };
      const now = new Date("2026-10-09T00:00:00Z");

      expect(() => assertCalendarLinkAllowed(timetable, now)).not.toThrow();
    });

    it("throws BAD_REQUEST with link-sharing message for a PRIVATE timetable", () => {
      const timetable = {
        visibility: "PRIVATE",
        acadTerm: { endDt: new Date("2026-12-01T00:00:00Z") },
      };
      const now = new Date("2026-10-09T00:00:00Z");

      expect(() => assertCalendarLinkAllowed(timetable, now)).toThrowError(
        TRPCError,
      );

      try {
        assertCalendarLinkAllowed(timetable, now);
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        const trpcErr = err as TRPCError;
        expect(trpcErr.code).toBe("BAD_REQUEST");
        expect(trpcErr.message).toBe(
          "Set your timetable to link-sharing before creating a calendar link",
        );
        expect(trpcErr.message).toContain("link-sharing");
      }
    });

    it("throws BAD_REQUEST for an ended term with no link-sharing text", () => {
      const timetable = {
        visibility: "UNLISTED",
        acadTerm: { endDt: new Date("2026-10-01T00:00:00Z") },
      };
      const now = new Date("2026-10-09T00:00:00Z");

      expect(() => assertCalendarLinkAllowed(timetable, now)).toThrowError(
        TRPCError,
      );

      try {
        assertCalendarLinkAllowed(timetable, now);
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        const trpcErr = err as TRPCError;
        expect(trpcErr.code).toBe("BAD_REQUEST");
        expect(trpcErr.message).toBe(
          "This term has ended, so a calendar link can no longer be created",
        );
        expect(trpcErr.message).not.toContain("link-sharing");
      }
    });
  });
});

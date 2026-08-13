import type { ArrangedClass } from "@/modules/timetable/components/TimetableGrid";

export type SlotWithClass = {
  class: {
    id: string;
    section: string;
    course: { code: string; name: string; creditUnits: number };
    professor?: { name: string } | null;
    classTimings: {
      dayOfWeek: string | null;
      startTime: string;
      endTime: string;
      venue: string | null;
    }[];
    classExamTimings: {
      date: Date | string;
      dayOfWeek: string | null;
      startTime: string;
      endTime: string;
      venue: string | null;
    }[];
  };
};

/**
 * Map a `UserTimetableSlot` (with class.course / classTimings /
 * classExamTimings / professor included) to the chart's `ArrangedClass`.
 * Lives under `src/modules/` (not `@/server/…`) so client components can
 * import it for optimistic updates without leaking server code into the
 * bundle. Previously copy-pasted in getArrangement, getFeedData and
 * getSharedTimetable; getFeedData passes `{ omitProfessorName: true }` for
 * the no-PII iCal rule.
 */
export function toArrangedClass(
  slot: SlotWithClass,
  opts: { omitProfessorName?: boolean } = {},
): ArrangedClass {
  return {
    classId: slot.class.id,
    courseCode: slot.class.course.code,
    courseName: slot.class.course.name,
    section: slot.class.section,
    professorName: opts.omitProfessorName
      ? null
      : (slot.class.professor?.name ?? null),
    creditUnits: slot.class.course.creditUnits,
    timings: slot.class.classTimings.map((t) => ({
      dayOfWeek: t.dayOfWeek,
      startTime: t.startTime,
      endTime: t.endTime,
      venue: t.venue,
    })),
    examTimings: slot.class.classExamTimings.map((e) => ({
      date: e.date,
      dayOfWeek: e.dayOfWeek,
      startTime: e.startTime,
      endTime: e.endTime,
      venue: e.venue,
    })),
  };
}

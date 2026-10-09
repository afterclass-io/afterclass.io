import type { ClassTimingLike } from "@/modules/timetable/functions/slot-math";

export type ArrangedClass = {
  classId: string;
  courseCode: string;
  courseName: string;
  section: string;
  professorName?: string | null;
  creditUnits: number;
  timings: ClassTimingLike[];
  examTimings: ClassExamTiming[];
};

export type ClassExamTiming = {
  date: Date | string;
  dayOfWeek?: string | null;
  startTime: string;
  endTime: string;
  venue?: string | null;
};

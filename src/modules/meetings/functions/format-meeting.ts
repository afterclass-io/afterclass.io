import { formatDateRangeSGT } from "@/common/functions/format-date-range-sgt";

export type MeetingSummaryInput = {
  startDate: Date | string;
  endDate: Date | string;
  startHour: number;
  endHour: number;
  participantCount: number;
};

const pad = (hour: number) => String(hour).padStart(2, "0");

export function formatMeetingHours(startHour: number, endHour: number): string {
  return `${pad(startHour)}:00–${pad(endHour)}:00`;
}

/** Compact 12-hour label for the time pickers, e.g. 8 -> "8 AM", 12 -> "12 PM", 24 -> "12 AM". */
export function formatHourLabel(hour: number): string {
  const normalized = hour % 24;
  const suffix = normalized < 12 ? "AM" : "PM";
  return `${normalized % 12 || 12} ${suffix}`;
}

export function formatPeopleCount(count: number): string {
  return `${count} ${count === 1 ? "person" : "people"}`;
}

/** One-line summary shown on meeting cards, e.g. "12–16 Oct · 08:00–22:00 · 2 people". */
export function formatMeetingSummary(meeting: MeetingSummaryInput): string {
  return [
    formatDateRangeSGT(meeting.startDate, meeting.endDate),
    formatMeetingHours(meeting.startHour, meeting.endHour),
    formatPeopleCount(meeting.participantCount),
  ].join(" · ");
}

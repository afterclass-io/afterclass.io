import { formatDateSGT } from "@/common/functions/format-date-sgt";

const DAY_MONTH: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
const DAY_MONTH_YEAR: Intl.DateTimeFormatOptions = {
  ...DAY_MONTH,
  year: "numeric",
};

function sgtParts(d: Date) {
  return {
    year: formatDateSGT(d, { year: "numeric" }),
    month: formatDateSGT(d, { month: "short" }),
    day: formatDateSGT(d, { day: "numeric" }),
  };
}

/**
 * Compact SGT date range: "12–16 Oct", "30 Oct – 2 Nov", or "5 Oct" for a
 * single day. The year is appended only when it differs from `now`'s year.
 */
export function formatDateRangeSGT(
  start: Date | string,
  end: Date | string,
  now: Date = new Date(),
): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const from = sgtParts(startDate);
  const to = sgtParts(endDate);
  const currentYear = sgtParts(now).year;
  const showYear = from.year !== currentYear || to.year !== currentYear;
  const dayMonth = showYear ? DAY_MONTH_YEAR : DAY_MONTH;

  if (
    formatDateSGT(startDate, DAY_MONTH_YEAR) ===
    formatDateSGT(endDate, DAY_MONTH_YEAR)
  ) {
    return formatDateSGT(startDate, dayMonth);
  }
  if (from.year === to.year && from.month === to.month) {
    const suffix = formatDateSGT(endDate, {
      month: "short",
      ...(showYear && { year: "numeric" }),
    });
    return `${from.day}–${to.day} ${suffix}`;
  }
  return `${formatDateSGT(startDate, dayMonth)} – ${formatDateSGT(endDate, dayMonth)}`;
}

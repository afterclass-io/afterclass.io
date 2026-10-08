const SGT: Intl.DateTimeFormatOptions = { timeZone: "Asia/Singapore" };

/** en-SG date, always in Singapore time (the app is SGT-only). */
export function formatDateSGT(
  d: Date | string | number,
  opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  },
): string {
  return new Date(d).toLocaleDateString("en-SG", { ...opts, ...SGT });
}

/** 24-hour `HH:mm` clock time in Singapore time. */
export function formatTimeSGT(d: Date | string | number): string {
  return new Date(d).toLocaleTimeString("en-SG", {
    ...SGT,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** "06 Jul 2026, Mon 5PM" or "06 Jul 2026, Mon 5:30PM", always Singapore time. */
export function formatDateTimeSGT(d: Date | string | number): string {
  const parts = new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Singapore",
  }).formatToParts(new Date(d));

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const month = get("month");
  const day = get("day");
  const year = get("year");
  const weekday = get("weekday");
  let hour = parseInt(get("hour"), 10);
  const minute = get("minute");
  const dayPeriod = get("dayPeriod").toUpperCase();

  if (hour === 0) hour = 12;

  const timeStr =
    minute === "00" ? `${hour}${dayPeriod}` : `${hour}:${minute}${dayPeriod}`;

  return `${day} ${month} ${year}, ${weekday} ${timeStr}`;
}

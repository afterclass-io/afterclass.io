const SGT: Intl.DateTimeFormatOptions = { timeZone: "Asia/Singapore" };

/** en-SG date, always in Singapore time (the app is SGT-only). */
export function formatDateSGT(
  d: Date | string,
  opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  },
): string {
  return new Date(d).toLocaleDateString("en-SG", { ...opts, ...SGT });
}

/** 24-hour `HH:mm` clock time in Singapore time. */
export function formatTimeSGT(d: Date | string): string {
  return new Date(d).toLocaleTimeString("en-SG", {
    ...SGT,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

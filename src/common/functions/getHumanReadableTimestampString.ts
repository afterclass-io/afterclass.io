import { formatDateSGT, formatTimeSGT } from "./format-date-sgt";

/**
 * Returns a human readable timestamp string like "15 Jun 2022 20:30" in SGT.
 *
 * @param ts timestamp in milliseconds
 */
export function getHumanReadableTimestampString(ts: number) {
  return `${formatDateSGT(ts)} ${formatTimeSGT(ts)}`;
}

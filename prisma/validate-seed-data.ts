/** Fail fast on non-"HH:MM" seed times — the render parsers are strict. */
export function assertStrictTimeFormats(
  rows: readonly { startTime: string; endTime: string }[],
  file: string,
): void {
  rows.forEach((row, i) => {
    for (const t of [row.startTime, row.endTime]) {
      const m = /^(\d{2}):(\d{2})$/.exec(t);
      const h = m ? Number(m[1]) : -1;
      const min = m ? Number(m[2]) : -1;
      if (!m || h > 23 || min > 59) {
        throw new Error(
          `${file}: invalid time "${t}" at row ${i} (expected strict HH:MM)`,
        );
      }
    }
  });
}

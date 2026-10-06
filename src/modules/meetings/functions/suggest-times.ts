import {
  assertIsoDate,
  formatHhmm,
  parseHhmm,
  type PollGrid,
  pollDays,
  slotsPerDay,
  slotStartUtcMs,
  SlotTimeError,
  type Weekday,
  weekdayLabel,
  weekdayOf,
  type WeekdayLabel,
} from "./slot-time";

export const DEFAULT_DURATION_MINUTES = 60;
export const MAX_DURATION_MINUTES = 480;
export const DEFAULT_SUGGESTION_LIMIT = 5;
export const MAX_SUGGESTION_LIMIT = 10;

export type SuggestParticipant = {
  name: string;
  availableSlots: readonly number[];
  ifNeededSlots: readonly number[];
};

export type SuggestQuery = {
  durationMinutes?: number;
  dates?: string[];
  from?: string;
  to?: string;
  daysOfWeek?: Weekday[];
  earliestStart?: string;
  latestEnd?: string;
  requireParticipants?: string[];
  includePast?: boolean;
  limit?: number;
};

export type TimeOption = {
  date: string;
  weekday: WeekdayLabel;
  start: string;
  end: string;
  startRange: { earliest: string; latest: string };
  free: string[];
  ifNeeded: string[];
  unavailable: string[];
  attendable: number;
  total: number;
};

export type SuggestEmptyReason = "all-past";

export type SuggestTimesResult = {
  participants: { total: number; noResponse: string[] };
  options: TimeOption[];
  bestPerDay: TimeOption[];
  nobodyCanAttend: boolean;
  /** True when requireParticipants was given and no block works for all of them; options then show the closest blocks. */
  requiredUnmet: boolean;
  emptyReason: SuggestEmptyReason | null;
};

export function disambiguateNames(names: readonly string[]): string[] {
  const originalNames = new Set(names);
  const assigned = new Set<string>();
  const seenCount = new Map<string, number>();
  const result: string[] = [];

  for (const name of names) {
    const count = (seenCount.get(name) ?? 0) + 1;
    seenCount.set(name, count);

    if (count === 1 && !assigned.has(name)) {
      assigned.add(name);
      result.push(name);
    } else {
      let k = Math.max(2, count);
      let candidate = `${name} ${k}`;
      while (originalNames.has(candidate) || assigned.has(candidate)) {
        k++;
        candidate = `${name} ${k}`;
      }
      assigned.add(candidate);
      result.push(candidate);
    }
  }

  return result;
}

type Block = {
  date: string;
  weekday: WeekdayLabel;
  s: number;
  start: string;
  end: string;
  free: string[];
  ifNeeded: string[];
  unavailable: string[];
  attendable: number;
  total: number;
  statusVector: string[];
};

function statusVectorsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function compareOptions(a: TimeOption, b: TimeOption): number {
  if (b.attendable !== a.attendable) {
    return b.attendable - a.attendable;
  }
  if (b.free.length !== a.free.length) {
    return b.free.length - a.free.length;
  }
  if (a.date !== b.date) {
    return a.date < b.date ? -1 : 1;
  }
  if (a.start !== b.start) {
    return a.start < b.start ? -1 : 1;
  }
  return 0;
}

export function suggestMeetingTimes(input: {
  grid: PollGrid;
  participants: readonly SuggestParticipant[];
  query: SuggestQuery;
  now: Date;
}): SuggestTimesResult {
  // 1. durationMinutes validation
  const durationMinutes =
    input.query.durationMinutes ?? DEFAULT_DURATION_MINUTES;
  if (durationMinutes > MAX_DURATION_MINUTES) {
    throw new SlotTimeError("durationMinutes must be at most 480.");
  }
  if (
    durationMinutes <= 0 ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes % input.grid.slotMinutes !== 0
  ) {
    throw new SlotTimeError(
      `durationMinutes must be a multiple of ${input.grid.slotMinutes} for this poll.`,
    );
  }

  // 2. limit validation
  const limit = input.query.limit ?? DEFAULT_SUGGESTION_LIMIT;
  if (
    input.query.limit !== undefined &&
    (!Number.isInteger(input.query.limit) ||
      input.query.limit < 1 ||
      input.query.limit > MAX_SUGGESTION_LIMIT)
  ) {
    throw new SlotTimeError("limit must be between 1 and 10.");
  }

  // 3. dates vs from/to mutually exclusive
  if (
    input.query.dates !== undefined &&
    (input.query.from !== undefined || input.query.to !== undefined)
  ) {
    throw new SlotTimeError("Pass either dates or from/to, not both.");
  }

  // 4. dates validation
  if (input.query.dates !== undefined) {
    for (const d of input.query.dates) {
      assertIsoDate(d);
      if (d < input.grid.startDate || d > input.grid.endDate) {
        throw new SlotTimeError(
          `Date ${d} is outside the poll window ${input.grid.startDate} to ${input.grid.endDate}.`,
        );
      }
    }
  }

  // 5. from/to validation
  if (input.query.from !== undefined) {
    assertIsoDate(input.query.from);
  }
  if (input.query.to !== undefined) {
    assertIsoDate(input.query.to);
  }
  if (
    input.query.from !== undefined &&
    input.query.to !== undefined &&
    input.query.from > input.query.to
  ) {
    throw new SlotTimeError("from must be on or before to.");
  }

  // 6. Filter poll days
  const allDays = pollDays(input.grid);
  let filteredDays = allDays;

  if (input.query.dates !== undefined) {
    const allowedDates = new Set(input.query.dates);
    filteredDays = filteredDays.filter((d) => allowedDates.has(d.date));
  } else if (input.query.from !== undefined || input.query.to !== undefined) {
    const effectiveFrom = input.query.from ?? input.grid.startDate;
    const effectiveTo = input.query.to ?? input.grid.endDate;
    filteredDays = filteredDays.filter(
      (d) => d.date >= effectiveFrom && d.date <= effectiveTo,
    );
  }

  if (input.query.daysOfWeek !== undefined) {
    const allowedDays = new Set(input.query.daysOfWeek);
    filteredDays = filteredDays.filter((d) => allowedDays.has(weekdayOf(d.date)));
  }

  if (filteredDays.length === 0) {
    const startWkd = weekdayLabel(weekdayOf(input.grid.startDate));
    const endWkd = weekdayLabel(weekdayOf(input.grid.endDate));
    throw new SlotTimeError(
      `No poll days match the requested dates/days. The poll runs ${input.grid.startDate} (${startWkd}) to ${input.grid.endDate} (${endWkd}).`,
    );
  }

  // 7. Daily bounds
  let earliestMinutes: number | undefined;
  if (input.query.earliestStart !== undefined) {
    earliestMinutes = parseHhmm(input.query.earliestStart);
  }

  let latestMinutes: number | undefined;
  if (input.query.latestEnd !== undefined) {
    latestMinutes = parseHhmm(input.query.latestEnd);
  }

  if (
    earliestMinutes !== undefined &&
    latestMinutes !== undefined &&
    earliestMinutes >= latestMinutes
  ) {
    throw new SlotTimeError("earliestStart must be before latestEnd.");
  }

  const ceilToGrid =
    earliestMinutes !== undefined
      ? Math.ceil(earliestMinutes / input.grid.slotMinutes) *
        input.grid.slotMinutes
      : input.grid.startHour * 60;
  const floorToGrid =
    latestMinutes !== undefined
      ? Math.floor(latestMinutes / input.grid.slotMinutes) *
        input.grid.slotMinutes
      : input.grid.endHour * 60;

  const lo = Math.max(input.grid.startHour * 60, ceilToGrid);
  const hi = Math.min(input.grid.endHour * 60, floorToGrid);

  if (hi - lo < durationMinutes) {
    throw new SlotTimeError(
      `A ${durationMinutes}-minute meeting does not fit between ${formatHhmm(lo)} and ${formatHhmm(hi)} SGT.`,
    );
  }

  // 8. Participants disambiguation and requireParticipants validation
  const disambiguatedNames = disambiguateNames(
    input.participants.map((p) => p.name),
  );

  const nameLowerToDisambiguated = new Map<string, string>();
  for (const name of disambiguatedNames) {
    nameLowerToDisambiguated.set(name.toLowerCase(), name);
  }

  let requiredNamesSet: Set<string> | null = null;
  if (
    input.query.requireParticipants !== undefined &&
    input.query.requireParticipants.length > 0
  ) {
    const unmatched: string[] = [];
    const matched: string[] = [];
    for (const raw of input.query.requireParticipants) {
      const key = raw.trim().toLowerCase();
      const found = nameLowerToDisambiguated.get(key);
      if (found !== undefined) {
        matched.push(found);
      } else {
        unmatched.push(raw);
      }
    }

    if (unmatched.length > 0) {
      throw new SlotTimeError(
        `Unknown participant name(s): ${unmatched.join(", ")}. Participants: ${disambiguatedNames.join(", ")}.`,
      );
    }

    requiredNamesSet = new Set(matched);
  }

  // Participants summary
  const noResponse: string[] = [];
  for (let i = 0; i < input.participants.length; i++) {
    const p = input.participants[i]!;
    if (p.availableSlots.length === 0 && p.ifNeededSlots.length === 0) {
      noResponse.push(disambiguatedNames[i]!);
    }
  }
  const participantsSummary = {
    total: input.participants.length,
    noResponse,
  };

  // Precompute sets per participant
  const participantSets = input.participants.map((p) => ({
    avail: new Set(p.availableSlots),
    either: new Set([...p.availableSlots, ...p.ifNeededSlots]),
  }));

  const spd = slotsPerDay(input.grid);
  const L = durationMinutes / input.grid.slotMinutes;
  const includePast = input.query.includePast ?? false;
  const nowMs = input.now.getTime();

  let totalKeptBlocks = 0;
  const blocksByDay = new Map<string, Block[]>();
  const gridStartMs = Date.parse(`${input.grid.startDate}T00:00:00Z`);

  for (const day of filteredDays) {
    const dayMs = Date.parse(`${day.date}T00:00:00Z`);
    const dayIndex = Math.round((dayMs - gridStartMs) / 86400000);
    const dayOffset = dayIndex * spd;
    const dayBlocks: Block[] = [];

    for (let s = 0; s <= spd - L; s++) {
      const slotStartMin =
        input.grid.startHour * 60 + s * input.grid.slotMinutes;
      const slotEndMin = slotStartMin + durationMinutes;

      if (slotStartMin < lo || slotEndMin > hi) {
        continue;
      }

      const firstSlot = dayOffset + s;
      if (!includePast && slotStartUtcMs(input.grid, firstSlot) < nowMs) {
        continue;
      }

      totalKeptBlocks++;

      const free: string[] = [];
      const ifNeeded: string[] = [];
      const unavailable: string[] = [];
      const statusVector: string[] = [];

      for (let pIdx = 0; pIdx < input.participants.length; pIdx++) {
        const pName = disambiguatedNames[pIdx]!;
        const { avail, either } = participantSets[pIdx]!;

        let allAvail = true;
        let allEither = true;
        for (let slot = firstSlot; slot < firstSlot + L; slot++) {
          if (!avail.has(slot)) {
            allAvail = false;
          }
          if (!either.has(slot)) {
            allEither = false;
          }
        }

        if (allAvail) {
          free.push(pName);
          statusVector.push("free");
        } else if (allEither) {
          ifNeeded.push(pName);
          statusVector.push("maybe");
        } else {
          unavailable.push(pName);
          statusVector.push("unavailable");
        }
      }

      dayBlocks.push({
        date: day.date,
        weekday: day.weekday,
        s,
        start: formatHhmm(slotStartMin),
        end: formatHhmm(slotEndMin),
        free,
        ifNeeded,
        unavailable,
        attendable: free.length + ifNeeded.length,
        total: input.participants.length,
        statusVector,
      });
    }

    blocksByDay.set(day.date, dayBlocks);
  }

  if (totalKeptBlocks === 0) {
    return {
      participants: participantsSummary,
      options: [],
      bestPerDay: [],
      nobodyCanAttend: true,
      requiredUnmet: false,
      emptyReason: "all-past",
    };
  }

  // Collapse consecutive blocks per day with identical status vector
  const allGroups: TimeOption[] = [];

  for (const day of filteredDays) {
    const dayBlocks = blocksByDay.get(day.date) ?? [];
    let currentGroup: {
      option: TimeOption;
      lastS: number;
      statusVector: string[];
    } | null = null;

    for (const block of dayBlocks) {
      if (
        currentGroup !== null &&
        block.s === currentGroup.lastS + 1 &&
        statusVectorsEqual(block.statusVector, currentGroup.statusVector)
      ) {
        currentGroup.lastS = block.s;
        currentGroup.option.startRange.latest = block.start;
      } else {
        if (currentGroup !== null) {
          allGroups.push(currentGroup.option);
        }
        currentGroup = {
          option: {
            date: block.date,
            weekday: block.weekday,
            start: block.start,
            end: block.end,
            startRange: { earliest: block.start, latest: block.start },
            free: block.free,
            ifNeeded: block.ifNeeded,
            unavailable: block.unavailable,
            attendable: block.attendable,
            total: block.total,
          },
          lastS: block.s,
          statusVector: block.statusVector,
        };
      }
    }

    if (currentGroup !== null) {
      allGroups.push(currentGroup.option);
    }
  }

  // Require handling
  let pool: TimeOption[];
  let requiredUnmet = false;

  if (requiredNamesSet !== null) {
    const reqNames = Array.from(requiredNamesSet);
    const requiredMetGroups = allGroups.filter((g) =>
      reqNames.every((name) => !g.unavailable.includes(name)),
    );

    if (requiredMetGroups.length > 0) {
      pool = requiredMetGroups;
      requiredUnmet = false;
    } else {
      pool = allGroups;
      requiredUnmet = true;
    }
  } else {
    pool = allGroups;
    requiredUnmet = false;
  }

  const sortedPool = [...pool].sort(compareOptions);
  const nobodyCanAttend = !pool.some((g) => g.attendable > 0);

  let options: TimeOption[];
  if (nobodyCanAttend) {
    options = sortedPool.slice(0, limit);
  } else {
    options = sortedPool.filter((g) => g.attendable > 0).slice(0, limit);
  }

  const bestPerDay: TimeOption[] = [];
  for (const day of filteredDays) {
    const dayPoolGroups = pool.filter((g) => g.date === day.date);
    if (dayPoolGroups.length > 0) {
      const best = [...dayPoolGroups].sort(compareOptions)[0]!;
      bestPerDay.push(best);
    }
  }

  return {
    participants: participantsSummary,
    options,
    bestPerDay,
    nobodyCanAttend,
    requiredUnmet,
    emptyReason: null,
  };
}

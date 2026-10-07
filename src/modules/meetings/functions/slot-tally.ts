export type TallyParticipant = {
  name: string;
  availableSlots: number[];
  ifNeededSlots: number[];
};

export type SlotTally = {
  available: string[];
  ifNeeded: string[];
};

export type SlotBreakdown = SlotTally & { unavailable: string[] };

const EMPTY_TALLY: SlotTally = { available: [], ifNeeded: [] };

/**
 * Who is free at each slot, built in one pass over all participants so a
 * render never has to scan every participant's slot list per cell.
 */
export function buildSlotTally(
  participants: readonly TallyParticipant[],
): ReadonlyMap<number, SlotTally> {
  const tally = new Map<number, SlotTally>();
  const entryFor = (slot: number) => {
    let entry = tally.get(slot);
    if (!entry) {
      entry = { available: [], ifNeeded: [] };
      tally.set(slot, entry);
    }
    return entry;
  };

  for (const participant of participants) {
    const available = new Set(participant.availableSlots);
    for (const slot of available) {
      entryFor(slot).available.push(participant.name);
    }
    for (const slot of participant.ifNeededSlots) {
      // Available wins when a slot is somehow in both lists.
      if (!available.has(slot)) {
        entryFor(slot).ifNeeded.push(participant.name);
      }
    }
  }
  return tally;
}

export function getSlotTally(
  tally: ReadonlyMap<number, SlotTally>,
  slot: number,
): SlotTally {
  return tally.get(slot) ?? EMPTY_TALLY;
}

/** Names split into free, if-needed and everyone else for one slot (hover only, so a per-participant scan is fine). */
export function getSlotBreakdown(
  tally: ReadonlyMap<number, SlotTally>,
  slot: number,
  participants: readonly TallyParticipant[],
): SlotBreakdown {
  const { available, ifNeeded } = getSlotTally(tally, slot);
  return {
    available,
    ifNeeded,
    unavailable: participants
      .filter(
        (p) =>
          !p.availableSlots.includes(slot) && !p.ifNeededSlots.includes(slot),
      )
      .map((p) => p.name),
  };
}

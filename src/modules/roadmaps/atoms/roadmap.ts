import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { Conflict, Entry } from "../functions/conflicts";

// ---------------------------------------------------------------------------
// Local editing state — mirrors server data but allows optimistic updates
// ---------------------------------------------------------------------------

/** The entries currently displayed in the roadmap editor. */
export const roadmapEntriesAtom = atom<Entry[]>([]);

/** True when local entries differ from the last saved state. */
export const roadmapDirtyAtom = atom(false);

/** Conflicts detected in the current set of entries. */
export const roadmapConflictsAtom = atom<Conflict[]>([]);

// ---------------------------------------------------------------------------
// Editor layout — resizable panel widths (px), persisted in localStorage
// ---------------------------------------------------------------------------

export type RoadmapPanelWidths = {
  /** "My Roadmaps" list width. */
  list: number;
  /** Course search sidebar width. */
  sidebar: number;
};

export const ROADMAP_PANEL_DEFAULTS: RoadmapPanelWidths = {
  list: 208, // matches the previous lg:w-52
  sidebar: 256, // matches the previous lg:w-64
};

/** Resizable editor panel widths (lg+ only), persisted per browser. */
export const roadmapPanelWidthsAtom = atomWithStorage<RoadmapPanelWidths>(
  "roadmap-editor-panel-widths",
  ROADMAP_PANEL_DEFAULTS,
);

/**
 * Whether the roadmaps product tour has already auto-started for this
 * browser. Set when a started tour ends (finish or dismiss).
 */
export const hasSeenRoadmapsTourAtom = atomWithStorage<boolean>(
  "hasSeenRoadmapsTour",
  false,
  undefined,
  { getOnInit: true },
);

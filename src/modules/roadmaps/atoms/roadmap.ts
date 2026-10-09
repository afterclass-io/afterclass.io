import { atomWithStorage } from "jotai/utils";

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

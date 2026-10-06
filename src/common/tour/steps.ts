import type { TourStep } from "./tour";

/**
 * Timetable page tour. Anchors use the stable `data-test` selectors the
 * Cypress suite relies on; steps whose anchor is hidden (logged out, empty
 * states) are skipped at runtime by `startTour`.
 */
export const timetableTourSteps: TourStep[] = [
  {
    element: '[data-test="timetable-term-picker"]',
    popover: {
      title: "Pick your term",
      description:
        "Choose the academic term you're planning for. Your plans, classes and bids below all update to match.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-test="timetable-variant-switcher"]',
    popover: {
      title: "Compare timetable plans",
      description:
        "Build a few plans for the same term and switch between them here — handy when you're weighing different section combos.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-test="timetable-variant-active-toggle"]',
    popover: {
      title: "Star your active plan",
      description:
        "The starred plan is your active one — it's the plan your bids sync to when bidding opens on BOSS.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-test="timetable-search-input"]',
    popover: {
      title: "Find and add courses",
      description:
        "Search for a course, pick a section and add it to your timetable. It lands on the grid instantly.",
      side: "left",
      align: "start",
    },
  },
  {
    element: '[data-test="timetable-grid"]',
    popover: {
      title: "Your week at a glance",
      description:
        "Click any class for details, bid predictions and notes. You can also remove a class from here.",
      side: "top",
      align: "center",
    },
  },
  {
    element: '[data-test="bids-view"]',
    popover: {
      title: "Track your bids",
      description:
        "Dashboard cards and the full bid table live here, with 2-decimal bid prices. Bids are tracked per term and apply to every plan in it.",
      side: "top",
      align: "center",
    },
  },
  {
    element: '[data-test="share-button"]',
    popover: {
      title: "Share or export",
      description:
        "Share a read-only link with friends, or export your timetable straight to your calendar.",
      side: "bottom",
      align: "end",
    },
  },
];

/**
 * Roadmaps page tour. Same anchor-skipping rules as the timetable tour.
 */
export const roadmapsTourSteps: TourStep[] = [
  {
    element: '[aria-label="Create new roadmap"]',
    popover: {
      title: "Create a roadmap",
      description:
        "Name a roadmap for your degree plan. Make a few to compare different paths.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-test="roadmap-list"]',
    popover: {
      title: "Your roadmaps",
      description:
        "Click a roadmap to open it. The star marks your active one.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-test="roadmap-active-toggle"]',
    popover: {
      title: "Set your active roadmap",
      description:
        "Your active roadmap syncs with your timetables across terms, so your plan and your schedule stay in step.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[aria-label="Search courses to add to roadmap"]',
    popover: {
      title: "Search courses",
      description:
        "Find courses here, then drag the chips into a term on the grid.",
      side: "left",
      align: "start",
    },
  },
  {
    element: '[data-droppable-id="1-T1"]',
    popover: {
      title: "Plan term by term",
      description:
        "Drop courses into terms to map out your degree. Anything that clashes gets flagged for you.",
      side: "top",
      align: "center",
    },
  },
  {
    element: '[data-test="roadmap-view-toggle"]',
    popover: {
      title: "Grid or timeline",
      description:
        "Flip between the term grid and a timeline view of your plan — whichever reads better for you.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: '[data-test="share-button"]',
    popover: {
      title: "Share your roadmap",
      description:
        "Publish a read-only link to show friends or seniors what you're planning to take.",
      side: "bottom",
      align: "end",
    },
  },
];

/**
 * Meeting room tour. Edit-mode steps (brush, calendars, autofill, save) are
 * skipped at runtime unless the viewer is editing, so replaying the tour from
 * inside Edit availability shows the full walkthrough.
 */
export const meetingsRoomTourSteps: TourStep[] = [
  {
    element: '[data-test="meeting-edit-availability"]',
    popover: {
      title: "Add your availability",
      description:
        "The grid shows everyone's availability combined: darker green means more people are free. Press Edit availability to mark when you are free.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: '[data-test="meeting-brush-group"]',
    popover: {
      title: "Pick a colour, then paint",
      description:
        "Choose Available, If needed or Unavailable, then click or drag across the grid. Keys 1, 2 and 3 switch colours.",
      side: "left",
      align: "start",
    },
  },
  {
    element: '[data-test="meeting-autofill"]',
    popover: {
      title: "Autofill from your calendar",
      description:
        "Mark every slot your timetable or Google Calendar leaves free, then adjust by hand.",
      side: "left",
      align: "start",
    },
  },
  {
    element: '[data-test="meeting-calendars"]',
    popover: {
      title: "See your own commitments",
      description:
        "Tick a calendar to draw your classes or events on the grid as boxes, so you can see what you already have on.",
      side: "left",
      align: "start",
    },
  },
  {
    element: '[data-test="save-availability-button"]',
    popover: {
      title: "Save when you are done",
      description:
        "Your changes are only shared with the group once you save.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: '[data-test="meeting-details"]',
    popover: {
      title: "Agenda and links",
      description:
        "What the meeting is about and where to join. The person who created the meeting can edit these.",
      side: "left",
      align: "start",
    },
  },
  {
    element: '[data-test="meeting-copy-link"]',
    popover: {
      title: "Invite your group",
      description:
        "Copy the link and share it. Anyone who opens it can add their availability, and the meeting shows up in their list.",
      side: "bottom",
      align: "end",
    },
  },
];

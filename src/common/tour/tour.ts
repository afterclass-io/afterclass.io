import type { Config, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import "./tour.css";

export type TourStep = DriveStep;

export type StartTourOptions = {
  /** Called when the tour ends — finished, dismissed or destroyed. */
  onDestroyed?: () => void;
};

/**
 * Start a driver.js tour with the app's popover styling.
 *
 * Steps whose anchor element is not currently in the DOM (logged out, empty
 * states, collapsed UI) are skipped; if no anchors exist at all the tour
 * does not start and `false` is returned. driver.js is imported dynamically
 * so it never runs during SSR/prerender.
 */
export async function startTour(
  steps: TourStep[],
  opts?: StartTourOptions,
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const availableSteps = steps.filter(
    (step) =>
      typeof step.element === "string" &&
      document.querySelector(step.element) !== null,
  );
  if (availableSteps.length === 0) return false;

  const { driver } = await import("driver.js");

  const config: Config = {
    popoverClass: "ac-tour",
    showProgress: true,
    progressText: "{{current}} of {{total}}",
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Done",
    steps: availableSteps,
    onDestroyed: () => opts?.onDestroyed?.(),
  };

  driver(config).drive();
  return true;
}

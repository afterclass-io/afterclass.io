// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/common/components/tooltip";
import { CalendarExportPopoverView } from "./CalendarExportPopover";

describe("CalendarExportPopoverView rotation confirm flow", () => {
  it("shows confirm message on first click and calls onRotate on confirm", () => {
    const onRotate = vi.fn();
    render(
      <TooltipProvider>
        <CalendarExportPopoverView
          open={true}
          onOpenChange={vi.fn()}
          token="test-token"
          origin="https://afterclass.io"
          needsLinkSharing={false}
          isTurningOnLinkSharing={false}
          isRevoking={false}
          isRotating={false}
          onTurnOnLinkSharing={vi.fn()}
          onRevoke={vi.fn()}
          onRotate={onRotate}
        />
      </TooltipProvider>,
    );

    const rotateButton = document.querySelector(
      '[data-test="calendar-rotate-button"]',
    );
    expect(rotateButton).not.toBeNull();

    // Confirm text is not visible initially
    expect(
      screen.queryByText(
        "Your current link stops working. Anyone subscribed must add the new link.",
      ),
    ).toBeNull();

    // First click shows confirmation text without calling onRotate
    fireEvent.click(rotateButton!);
    expect(
      screen.getByText(
        "Your current link stops working. Anyone subscribed must add the new link.",
      ),
    ).toBeDefined();
    expect(onRotate).not.toHaveBeenCalled();

    // Click Confirm button
    const confirmButton = document.querySelector(
      '[data-test="calendar-rotate-confirm"]',
    );
    expect(confirmButton).not.toBeNull();
    fireEvent.click(confirmButton!);

    // Confirm calls onRotate once
    expect(onRotate).toHaveBeenCalledTimes(1);
  });
});

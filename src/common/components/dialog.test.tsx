// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./dialog";

function renderDialog(showCloseButton?: boolean) {
  render(
    <Dialog open>
      <DialogContent showCloseButton={showCloseButton}>
        <DialogTitle>Title</DialogTitle>
        <DialogDescription>Body</DialogDescription>
      </DialogContent>
    </Dialog>,
  );
}

describe("DialogContent close button", () => {
  it("shows the close button by default", () => {
    renderDialog();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("hides the close button when showCloseButton is false", () => {
    renderDialog(false);
    expect(
      screen.queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();
  });
});

describe("DialogContent overlay", () => {
  it("applies overlayClassName to the backdrop", () => {
    render(
      <Dialog open>
        <DialogContent overlayClassName="bg-background/60">
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Body</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    const overlay = document.querySelector("[data-slot='dialog-overlay']");
    expect(overlay).toHaveClass("bg-background/60");
    expect(overlay).not.toHaveClass("bg-background/50");
  });
});

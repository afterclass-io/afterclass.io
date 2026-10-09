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

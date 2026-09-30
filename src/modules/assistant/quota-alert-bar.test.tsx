// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QuotaAlertBar } from "./quota-alert-bar";

describe("QuotaAlertBar", () => {
  it("renders the connect upsell when not connected and quota is critical", () => {
    render(
      <QuotaAlertBar remaining={3} quota={20} hasConnectedAgent={false} />,
    );
    expect(screen.getByRole("status")).toBeTruthy();
    expect(
      screen.getByText(/connect your ai agent for unlimited/i),
    ).toBeTruthy();
  });

  it("renders the switch-to upsell when connected and quota is critical", () => {
    render(
      <QuotaAlertBar remaining={3} quota={20} hasConnectedAgent={true} />,
    );
    expect(screen.getByRole("status")).toBeTruthy();
    expect(
      screen.getByText(/switch to your connected agent for unlimited/i),
    ).toBeTruthy();
  });

  it("renders nothing when quota is healthy in either state", () => {
    const { unmount } = render(
      <QuotaAlertBar remaining={18} quota={20} hasConnectedAgent={false} />,
    );
    expect(screen.queryByRole("status")).toBeNull();
    unmount();
    render(
      <QuotaAlertBar remaining={18} quota={20} hasConnectedAgent={true} />,
    );
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("dismisses the alert", () => {
    render(
      <QuotaAlertBar remaining={3} quota={20} hasConnectedAgent={false} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByRole("status")).toBeNull();
  });
});

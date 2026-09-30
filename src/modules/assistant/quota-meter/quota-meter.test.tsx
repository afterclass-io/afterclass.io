// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QuotaMeter } from "./quota-meter";

describe("QuotaMeter", () => {
  it("scopes the headline to website messages", () => {
    render(
      <QuotaMeter
        remaining={14}
        quota={20}
        nudgeAt={16}
        hasConnectedAgent={false}
      />,
    );
    expect(
      screen.getByText("14 of 20 free website messages left this month"),
    ).toBeTruthy();
    expect(
      screen.queryByText("14 of 20 free messages left this month"),
    ).toBeNull();
  });

  it("notes the separate connected-agent bucket when connected", () => {
    render(
      <QuotaMeter
        remaining={14}
        quota={20}
        nudgeAt={16}
        hasConnectedAgent={true}
      />,
    );
    expect(
      screen.getByText("14 of 20 free website messages left this month"),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /website chats use this quota; connected-agent chats use your own credits/i,
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/unlimited - your connected agent/i)).toBeNull();
  });

  it("keeps the connect CTA when not connected", () => {
    render(
      <QuotaMeter
        remaining={14}
        quota={20}
        nudgeAt={16}
        hasConnectedAgent={false}
      />,
    );
    expect(screen.getByText(/get unlimited/i)).toBeTruthy();
  });
});

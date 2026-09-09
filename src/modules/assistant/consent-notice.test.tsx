// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConsentNotice } from "./consent-notice";

describe("ConsentNotice", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the notice copy with the privacy link", () => {
    render(<ConsentNotice onConsented={vi.fn()} />);
    expect(screen.getByLabelText("AI consent notice")).toBeTruthy();
    expect(screen.getByText("Before you chat with AI")).toBeTruthy();
    expect(screen.getByText("Agree and continue")).toBeTruthy();
    expect(screen.getByText("Not now")).toBeTruthy();
    const link = screen.getByRole("link", { name: "privacy policy" });
    expect(link.getAttribute("href")).toBe("/privacy");
  });

  it("Agree POSTs {agree:true} and calls onConsented", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const onConsented = vi.fn();
    render(<ConsentNotice onConsented={onConsented} />);
    fireEvent.click(screen.getByText("Agree and continue"));
    await waitFor(() => expect(onConsented).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/assistant/consent");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ agree: true }));
  });

  it("failed POST shows error text and does not call onConsented", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("boom", { status: 500 })),
    );
    const onConsented = vi.fn();
    render(<ConsentNotice onConsented={onConsented} />);
    fireEvent.click(screen.getByText("Agree and continue"));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Could not save your consent",
      ),
    );
    expect(onConsented).not.toHaveBeenCalled();
  });

  it("Not now dismisses without posting; review re-opens the notice", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ConsentNotice onConsented={vi.fn()} />);
    fireEvent.click(screen.getByText("Not now"));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("AI chat needs your OK to start.")).toBeTruthy();
    fireEvent.click(screen.getByText("Review notice"));
    expect(screen.getByText("Agree and continue")).toBeTruthy();
  });
});

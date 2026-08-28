// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./idb", () => ({
  idbGetAll: vi.fn(async () => []),
  idbPut: vi.fn(async () => undefined),
  idbDelete: vi.fn(async () => undefined),
}));

import { useChatStore, type StoredSession } from "./chat-store";
import { SessionList } from "./session-list";

const session = (id: string, title: string): StoredSession => ({
  id,
  title,
  updatedAt: new Date().toISOString(),
  messages: [],
});

let renameMock: (id: string, title: string) => Promise<void>;
let deleteMock: (id: string) => Promise<void>;

beforeEach(() => {
  renameMock = vi.fn((_id: string, _title: string): Promise<void> => Promise.resolve());
  deleteMock = vi.fn((_id: string): Promise<void> => Promise.resolve());
  useChatStore.setState({
    hydrated: true,
    sessions: [session("s1", "Math homework"), session("s2", "Essay draft")],
    activeSessionId: "s1",
    renameSession: renameMock,
    deleteSession: deleteMock,
  });
});

function renderList() {
  const onSelect = vi.fn();
  const onNew = vi.fn();
  render(<SessionList activeSessionId="s1" onSelect={onSelect} onNew={onNew} />);
  return { onSelect, onNew };
}

describe("SessionList a11y - non-nested interactives + focus/touch-visible actions (Task 7)", () => {
  it("keeps the row container non-interactive with flat, un-nested action buttons", () => {
    renderList();

    // The row is a plain <div>: a real select <button> carries the click target.
    const select = screen.getByRole("button", { name: "Math homework" });
    expect(select.tagName).toBe("BUTTON");

    const row = select.parentElement!;
    expect(row.tagName).toBe("DIV");
    expect(row.getAttribute("role")).toBeNull();
    expect(row.tabIndex).toBe(-1);

    // Rename/delete are sibling buttons OUTSIDE the select button - never nested
    // inside a role=button wrapper (the audit's empty-innerText bug).
    const rename = screen.getByRole("button", { name: /^rename math homework$/i });
    const del = screen.getByRole("button", { name: /^delete math homework$/i });
    expect(rename.parentElement).toBe(row);
    expect(del.parentElement).toBe(row);
    expect(rename.closest('[role="button"]')).toBeNull();
    expect(del.closest('[role="button"]')).toBeNull();
  });

  it("exposes action buttons to the keyboard and reveals them on focus/touch", () => {
    renderList();
    const rename = screen.getByRole("button", { name: /^rename math homework$/i });
    const del = screen.getByRole("button", { name: /^delete math homework$/i });

    for (const btn of [rename, del]) {
      // Real buttons are in the tab order (opacity is CSS-only, so assert the
      // reveal utilities: hover, keyboard :focus-visible, and touch media query).
      expect(btn.tagName).toBe("BUTTON");
      expect(btn.tabIndex).toBe(0);
      expect(btn.className).toContain("opacity-0");
      expect(btn.className).toContain("focus-visible:opacity-100");
      expect(btn.className).toContain("group-hover:opacity-100");
      expect(btn.className).toContain("[@media(hover:none)]:opacity-100");

      btn.focus();
      expect(document.activeElement).toBe(btn);
    }
  });

  it("highlights the active session on its select button", () => {
    renderList();
    expect(screen.getByRole("button", { name: "Math homework" }).getAttribute("aria-current")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "Essay draft" }).getAttribute("aria-current")).toBeNull();
  });

  it("selects a session when its select button is clicked", () => {
    const { onSelect } = renderList();
    fireEvent.click(screen.getByRole("button", { name: "Essay draft" }));
    expect(onSelect).toHaveBeenCalledWith("s2");
  });

  it("renames a session through the store", async () => {
    renderList();
    fireEvent.click(screen.getByRole("button", { name: /^rename math homework$/i }));
    const input = screen.getByLabelText("Session title");
    fireEvent.change(input, { target: { value: "Physics notes" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    await waitFor(() => expect(renameMock).toHaveBeenCalledWith("s1", "Physics notes"));
  });

  it("cancels rename on Escape without committing the draft", async () => {
    renderList();
    fireEvent.click(screen.getByRole("button", { name: /^rename math homework$/i }));
    const input = screen.getByLabelText("Session title");
    fireEvent.change(input, { target: { value: "Physics notes" } });
    fireEvent.keyDown(input, { key: "Escape", code: "Escape" });

    // Escape exits edit mode (editor unmounts); the blur-commit that fires on
    // unmount must NOT save the draft - the original title is preserved.
    await waitFor(() => expect(screen.queryByLabelText("Session title")).toBeNull());
    expect(renameMock).not.toHaveBeenCalled();
  });

  it("keeps the inline editor OUTSIDE any button, and hides action buttons during edit mode", () => {
    const { onSelect } = renderList();

    // Enter edit mode via the rename action.
    fireEvent.click(screen.getByRole("button", { name: /^rename math homework$/i }));
    const input = screen.getByLabelText("Session title");

    // The editor is a real editable input NOT nested inside a button
    // (no interactive-in-interactive; screen readers see it as editable).
    expect(input.tagName).toBe("INPUT");
    expect(input.closest("button")).toBeNull();

    // While editing, rename/delete are hidden - no action click can ever leak
    // into row selection, and there is no interactive-in-interactive.
    expect(screen.queryByRole("button", { name: /^rename math homework$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^delete math homework$/i })).toBeNull();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("deletes a session through the store after confirm", async () => {
    renderList();
    fireEvent.click(screen.getByRole("button", { name: /^delete math homework$/i }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith("s1"));
  });
});

describe("SessionList delete - inline confirm (no native alert)", () => {
  it("opens an inline confirm panel on trash click without calling window.confirm", () => {
    const confirmSpy = vi.fn();
    window.confirm = confirmSpy;
    renderList();
    fireEvent.click(screen.getByRole("button", { name: /^delete math homework$/i }));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/delete math homework\?/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("removes the session when Delete is confirmed in the panel", async () => {
    renderList();
    fireEvent.click(screen.getByRole("button", { name: /^delete math homework$/i }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith("s1"));
    expect(screen.queryByText(/delete math homework\?/i)).not.toBeInTheDocument();
  });

  it("closes without removing on Cancel", async () => {
    renderList();
    fireEvent.click(screen.getByRole("button", { name: /^delete math homework$/i }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(deleteMock).not.toHaveBeenCalled());
    expect(screen.queryByText(/delete math homework\?/i)).not.toBeInTheDocument();
  });

  it("cancels on Escape", async () => {
    renderList();
    fireEvent.click(screen.getByRole("button", { name: /^delete math homework$/i }));
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    await waitFor(() => expect(deleteMock).not.toHaveBeenCalled());
    expect(screen.queryByText(/delete math homework\?/i)).not.toBeInTheDocument();
  });
});

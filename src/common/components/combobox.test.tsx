// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { configure, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

configure({ testIdAttribute: "data-test" });

import { Combobox, type ComboboxOption } from "./combobox";

const sampleOptions: ComboboxOption[] = [
  { value: "IS111", label: "IS111 Intro to Programming" },
  { value: "IS216", label: "IS216 Software Engineering" },
  { value: "CS101", label: "CS101 Computer Science" },
];

beforeEach(() => {
  if (typeof window !== "undefined") {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.ResizeObserver = class ResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    };
  }
});

describe("Combobox", () => {
  it("the trigger has aria-haspopup='dialog' and aria-expanded='false', and after a click aria-expanded is 'true'", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        options={sampleOptions}
        value={null}
        onValueChange={vi.fn()}
        query=""
        onQueryChange={vi.fn()}
        placeholder="Filter..."
        triggerLabel="Select Course"
      />,
    );

    const trigger = screen.getByTestId("combobox-trigger");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("the input has role='combobox', aria-autocomplete='list', and aria-controls equal to the listbox id", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        options={sampleOptions}
        value={null}
        onValueChange={vi.fn()}
        query=""
        onQueryChange={vi.fn()}
        placeholder="Filter..."
        triggerLabel="Select Course"
      />,
    );

    await user.click(screen.getByTestId("combobox-trigger"));

    const input = screen.getByRole("combobox");
    const listbox = screen.getByRole("listbox");

    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input.getAttribute("aria-controls")).toBeTruthy();
    expect(input.getAttribute("aria-controls")).toBe(
      listbox.getAttribute("id"),
    );
  });

  it("the list has role='listbox' and each item has role='option'", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        options={sampleOptions}
        value={null}
        onValueChange={vi.fn()}
        query=""
        onQueryChange={vi.fn()}
        placeholder="Filter..."
        triggerLabel="Select Course"
      />,
    );

    await user.click(screen.getByTestId("combobox-trigger"));

    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(sampleOptions.length);
  });

  it("ArrowDown sets aria-activedescendant to the second option id and ArrowUp returns it to the first", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        options={sampleOptions}
        value={null}
        onValueChange={vi.fn()}
        query=""
        onQueryChange={vi.fn()}
        placeholder="Filter..."
        triggerLabel="Select Course"
      />,
    );

    await user.click(screen.getByTestId("combobox-trigger"));

    const input = screen.getByRole("combobox");
    const options = screen.getAllByRole("option");

    await user.keyboard("{ArrowDown}");
    expect(input.getAttribute("aria-activedescendant")).toBe(
      options[1]?.getAttribute("id"),
    );

    await user.keyboard("{ArrowUp}");
    expect(input.getAttribute("aria-activedescendant")).toBe(
      options[0]?.getAttribute("id"),
    );
  });

  it("Home and End highlight the first and last option", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        options={sampleOptions}
        value={null}
        onValueChange={vi.fn()}
        query=""
        onQueryChange={vi.fn()}
        placeholder="Filter..."
        triggerLabel="Select Course"
      />,
    );

    await user.click(screen.getByTestId("combobox-trigger"));

    const input = screen.getByRole("combobox");
    const options = screen.getAllByRole("option");

    await user.keyboard("{End}");
    expect(input.getAttribute("aria-activedescendant")).toBe(
      options[options.length - 1]?.getAttribute("id"),
    );

    await user.keyboard("{Home}");
    expect(input.getAttribute("aria-activedescendant")).toBe(
      options[0]?.getAttribute("id"),
    );
  });

  it("Enter selects the highlighted option and calls onValueChange with it", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <Combobox
        options={sampleOptions}
        value={null}
        onValueChange={onValueChange}
        query=""
        onQueryChange={vi.fn()}
        placeholder="Filter..."
        triggerLabel="Select Course"
      />,
    );

    await user.click(screen.getByTestId("combobox-trigger"));

    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    expect(onValueChange).toHaveBeenCalledWith(sampleOptions[1]);
  });

  it("Enter does nothing when isStale is true", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <Combobox
        options={sampleOptions}
        value={null}
        onValueChange={onValueChange}
        query="stat"
        onQueryChange={vi.fn()}
        placeholder="Filter..."
        triggerLabel="Select Course"
        isStale={true}
      />,
    );

    await user.click(screen.getByTestId("combobox-trigger"));

    await user.keyboard("{Enter}");

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("Escape closes the popover and focus returns to the trigger", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        options={sampleOptions}
        value={null}
        onValueChange={vi.fn()}
        query=""
        onQueryChange={vi.fn()}
        placeholder="Filter..."
        triggerLabel="Select Course"
      />,
    );

    const trigger = screen.getByTestId("combobox-trigger");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("clicking the selected option calls onValueChange(null) (deselect regression)", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <Combobox
        options={sampleOptions}
        value={sampleOptions[0]!}
        onValueChange={onValueChange}
        query=""
        onQueryChange={vi.fn()}
        placeholder="Filter..."
        triggerLabel="Select Course"
      />,
    );

    await user.click(screen.getByTestId("combobox-trigger"));

    const item = screen.getByTestId(`combobox-item-${sampleOptions[0]?.value}`);
    await user.click(item);

    expect(onValueChange).toHaveBeenCalledWith(null);
  });

  it("with total 40 and 10 options, the text 'Showing 10 of 40' is visible", async () => {
    const user = userEvent.setup();
    const tenOptions = Array.from({ length: 10 }, (_, i) => ({
      value: `opt-${i}`,
      label: `Option ${i}`,
    }));

    render(
      <Combobox
        options={tenOptions}
        total={40}
        value={null}
        onValueChange={vi.fn()}
        query=""
        onQueryChange={vi.fn()}
        placeholder="Filter..."
        triggerLabel="Select Course"
      />,
    );

    await user.click(screen.getByTestId("combobox-trigger"));

    expect(screen.getByText(/Showing 10 of 40/i)).toBeInTheDocument();
  });

  it("the list has aria-busy='true' when isStale is true", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        options={sampleOptions}
        value={null}
        onValueChange={vi.fn()}
        query=""
        onQueryChange={vi.fn()}
        placeholder="Filter..."
        triggerLabel="Select Course"
        isStale={true}
      />,
    );

    await user.click(screen.getByTestId("combobox-trigger"));

    const listbox = screen.getByRole("listbox");
    expect(listbox).toHaveAttribute("aria-busy", "true");
  });

  it("the data-test hooks combobox-trigger, combobox-input and combobox-item-<value> exist", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        options={sampleOptions}
        value={null}
        onValueChange={vi.fn()}
        query=""
        onQueryChange={vi.fn()}
        placeholder="Filter..."
        triggerLabel="Select Course"
      />,
    );

    expect(screen.getByTestId("combobox-trigger")).toBeInTheDocument();

    await user.click(screen.getByTestId("combobox-trigger"));

    expect(screen.getByTestId("combobox-input")).toBeInTheDocument();
    sampleOptions.forEach((opt) => {
      expect(
        screen.getByTestId(`combobox-item-${opt.value}`),
      ).toBeInTheDocument();
    });
  });

  it("the component forwards id, aria-invalid and aria-describedby to the trigger", () => {
    render(
      <Combobox
        options={sampleOptions}
        value={null}
        onValueChange={vi.fn()}
        query=""
        onQueryChange={vi.fn()}
        placeholder="Filter..."
        triggerLabel="Select Course"
        id="custom-combobox-id"
        aria-invalid={true}
        aria-describedby="custom-error-desc"
      />,
    );

    const trigger = screen.getByTestId("combobox-trigger");
    expect(trigger).toHaveAttribute("id", "custom-combobox-id");
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger).toHaveAttribute("aria-describedby", "custom-error-desc");
  });

  it("renders the hint, and never 'Nothing found.', when idle", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        options={[]}
        value={null}
        onValueChange={vi.fn()}
        query="a"
        onQueryChange={vi.fn()}
        placeholder="Filter..."
        triggerLabel="Select Course"
        idle={true}
        hintText="Type 2 or more characters to find a course."
      />,
    );

    await user.click(screen.getByTestId("combobox-trigger"));

    expect(
      within(screen.getByRole("listbox")).getByText(
        "Type 2 or more characters to find a course.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Nothing found.")).not.toBeInTheDocument();
  });

  it("renders 'Nothing found.' for settled zero rows when not idle", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        options={[]}
        value={null}
        onValueChange={vi.fn()}
        query="zzz"
        onQueryChange={vi.fn()}
        placeholder="Filter..."
        triggerLabel="Select Course"
        hintText="Type 2 or more characters to find a course."
      />,
    );

    await user.click(screen.getByTestId("combobox-trigger"));

    expect(screen.getByText("Nothing found.")).toBeInTheDocument();
  });
});

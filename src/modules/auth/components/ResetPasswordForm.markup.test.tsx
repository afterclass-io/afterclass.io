// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { ResetPasswordForm } from "./ResetPasswordForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/common/tools/supabase/client", () => ({
  supabaseBrowser: {
    auth: {
      updateUser: vi.fn(),
    },
  },
}));

vi.mock("@/common/providers/ProgressProvider", () => ({
  useProgress: () => ({ start: vi.fn(), done: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("ResetPasswordForm markup contract", () => {
  it("renders no data-test hooks", () => {
    const { container } = render(<ResetPasswordForm />);

    const dataTests = Array.from(container.querySelectorAll("[data-test]")).map(
      (el) => el.getAttribute("data-test"),
    );

    expect(dataTests).toEqual([]);
  });

  it("sets tabindex on the password input and submit button, keyed by tag name", () => {
    const { container } = render(<ResetPasswordForm />);

    const tabIndexes = Object.fromEntries(
      Array.from(container.querySelectorAll("[tabindex]")).map((el) => [
        el.tagName.toLowerCase(),
        el.getAttribute("tabindex"),
      ]),
    );

    expect(tabIndexes).toEqual({
      input: "1",
      button: "2",
    });
  });

  it("renders the password field label", () => {
    const { container } = render(<ResetPasswordForm />);

    const labels = Array.from(container.querySelectorAll("label")).map(
      (el) => el.textContent,
    );

    expect(labels).toEqual(["New Password"]);
  });

  it("renders the password input placeholder", () => {
    const { container } = render(<ResetPasswordForm />);

    const passwordInput = container.querySelector<HTMLInputElement>("input");

    expect(passwordInput?.getAttribute("placeholder")).toBe("Enter password");
  });

  it("renders the submit button idle text", () => {
    const { container } = render(<ResetPasswordForm />);

    const submitButton = container.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );

    expect(submitButton?.textContent).toBe("Reset Password");
  });
});

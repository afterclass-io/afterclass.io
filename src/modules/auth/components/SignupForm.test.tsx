// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { SignupForm } from "./SignupForm";

const { mockPush, mockSignUp, mockToastError } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockSignUp: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/common/tools/supabase/client", () => ({
  supabaseBrowser: {
    auth: {
      signUp: mockSignUp,
    },
  },
}));

vi.mock("@/common/providers/ProgressProvider", () => ({
  useProgress: () => ({ start: vi.fn(), done: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
  },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SignupForm", () => {
  it("pushes URL with encoded email when signup succeeds", async () => {
    mockSignUp.mockResolvedValueOnce({
      data: {
        user: {
          email: "test+sub@smu.edu.sg",
          user_metadata: { email_verified: false },
        },
      },
      error: null,
    });

    const { container } = render(<SignupForm />);
    const emailInput = container.querySelector<HTMLInputElement>(
      '[data-test="email"]',
    )!;
    const passwordInput = container.querySelector<HTMLInputElement>(
      '[data-test="password"]',
    )!;
    const confirmPasswordInput = container.querySelector<HTMLInputElement>(
      '[data-test="confirm-password"]',
    )!;
    const submitButton = container.querySelector<HTMLButtonElement>(
      '[data-test="submit"]',
    )!;

    fireEvent.change(emailInput, {
      target: { value: "test+sub@smu.edu.sg" },
    });
    fireEvent.change(passwordInput, {
      target: { value: "ValidPassword123!" },
    });
    fireEvent.change(confirmPasswordInput, {
      target: { value: "ValidPassword123!" },
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        "/account/auth/verify?email=test%2Bsub%40smu.edu.sg",
      );
    });
  });

  it("falls back to form email when user email from response is undefined", async () => {
    mockSignUp.mockResolvedValueOnce({
      data: {
        user: {
          email: undefined,
          user_metadata: { email_verified: false },
        },
      },
      error: null,
    });

    const { container } = render(<SignupForm />);
    const emailInput = container.querySelector<HTMLInputElement>(
      '[data-test="email"]',
    )!;
    const passwordInput = container.querySelector<HTMLInputElement>(
      '[data-test="password"]',
    )!;
    const confirmPasswordInput = container.querySelector<HTMLInputElement>(
      '[data-test="confirm-password"]',
    )!;
    const submitButton = container.querySelector<HTMLButtonElement>(
      '[data-test="submit"]',
    )!;

    fireEvent.change(emailInput, {
      target: { value: "test+sub@smu.edu.sg" },
    });
    fireEvent.change(passwordInput, {
      target: { value: "ValidPassword123!" },
    });
    fireEvent.change(confirmPasswordInput, {
      target: { value: "ValidPassword123!" },
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        "/account/auth/verify?email=test%2Bsub%40smu.edu.sg",
      );
    });
  });

  it("calls toast.error and does not call window.alert on Supabase error", async () => {
    const alertSpy = vi
      .spyOn(window, "alert")
      .mockImplementation(() => undefined);
    mockSignUp.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "User already registered" },
    });

    const { container } = render(<SignupForm />);
    const emailInput = container.querySelector<HTMLInputElement>(
      '[data-test="email"]',
    )!;
    const passwordInput = container.querySelector<HTMLInputElement>(
      '[data-test="password"]',
    )!;
    const confirmPasswordInput = container.querySelector<HTMLInputElement>(
      '[data-test="confirm-password"]',
    )!;
    const submitButton = container.querySelector<HTMLButtonElement>(
      '[data-test="submit"]',
    )!;

    fireEvent.change(emailInput, {
      target: { value: "test+sub@smu.edu.sg" },
    });
    fireEvent.change(passwordInput, {
      target: { value: "ValidPassword123!" },
    });
    fireEvent.change(confirmPasswordInput, {
      target: { value: "ValidPassword123!" },
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("User already registered");
    });
    expect(alertSpy).not.toHaveBeenCalled();
  });
});

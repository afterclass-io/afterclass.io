// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { ForgotPwdForm } from "./ForgotPwdForm";
import { ForgotPwdFormActionReturnType } from "../types";

const {
  mockPush,
  mockResetPasswordForEmail,
  mockGetUserPlatform,
  mockToastError,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockResetPasswordForEmail: vi.fn(),
  mockGetUserPlatform: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/common/tools/supabase/client", () => ({
  supabaseBrowser: {
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
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

vi.mock("../functions", () => ({
  getUserPlatform: mockGetUserPlatform,
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

describe("ForgotPwdForm", () => {
  it("pushes verify URL with encoded email on success", async () => {
    mockGetUserPlatform.mockResolvedValueOnce(
      ForgotPwdFormActionReturnType.USER_ON_V2,
    );
    mockResetPasswordForEmail.mockResolvedValueOnce({
      data: {},
      error: null,
    });

    const { container } = render(<ForgotPwdForm />);
    const emailInput = container.querySelector<HTMLInputElement>(
      '[data-test="email"]',
    )!;
    const submitButton = container.querySelector<HTMLButtonElement>(
      '[data-test="submit"]',
    )!;

    fireEvent.change(emailInput, {
      target: { value: "test+sub@smu.edu.sg" },
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        "/account/auth/verify?email=test%2Bsub%40smu.edu.sg",
      );
    });
  });

  it("pushes signup URL with encoded email when user is on v1", async () => {
    mockGetUserPlatform.mockResolvedValueOnce(
      ForgotPwdFormActionReturnType.USER_ON_V1,
    );

    const { container } = render(<ForgotPwdForm />);
    const emailInput = container.querySelector<HTMLInputElement>(
      '[data-test="email"]',
    )!;
    const submitButton = container.querySelector<HTMLButtonElement>(
      '[data-test="submit"]',
    )!;

    fireEvent.change(emailInput, {
      target: { value: "test+sub@smu.edu.sg" },
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        "/account/auth/signup?email=test%2Bsub%40smu.edu.sg",
      );
    });
  });

  it("calls toast.error and does not call window.alert on Supabase error", async () => {
    const alertSpy = vi
      .spyOn(window, "alert")
      .mockImplementation(() => undefined);
    mockGetUserPlatform.mockResolvedValueOnce(
      ForgotPwdFormActionReturnType.USER_ON_V2,
    );
    mockResetPasswordForEmail.mockResolvedValueOnce({
      data: null,
      error: { message: "Error sending reset email" },
    });

    const { container } = render(<ForgotPwdForm />);
    const emailInput = container.querySelector<HTMLInputElement>(
      '[data-test="email"]',
    )!;
    const submitButton = container.querySelector<HTMLButtonElement>(
      '[data-test="submit"]',
    )!;

    fireEvent.change(emailInput, {
      target: { value: "test+sub@smu.edu.sg" },
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Error sending reset email");
    });
    expect(alertSpy).not.toHaveBeenCalled();
  });
});

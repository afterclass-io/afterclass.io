// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResetPasswordForm } from "./ResetPasswordForm";

const { mockPush, mockUpdateUser, mockToastError } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/common/tools/supabase/client", () => ({
  supabaseBrowser: {
    auth: {
      updateUser: mockUpdateUser,
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ResetPasswordForm", () => {
  it("pushes login URL on successful password reset", async () => {
    mockUpdateUser.mockResolvedValueOnce({
      data: { user: {} },
      error: null,
    });

    render(<ResetPasswordForm />);
    const passwordInput = screen.getByPlaceholderText("Enter password");
    const submitButton = screen.getByRole("button", {
      name: /reset password/i,
    });

    fireEvent.change(passwordInput, {
      target: { value: "newPassword123" },
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/account/auth/login");
    });
  });

  it("calls toast.error and does not call window.alert on Supabase error", async () => {
    const alertSpy = vi
      .spyOn(window, "alert")
      .mockImplementation(() => undefined);
    mockUpdateUser.mockResolvedValueOnce({
      data: null,
      error: { message: "Password update failed" },
    });

    render(<ResetPasswordForm />);
    const passwordInput = screen.getByPlaceholderText("Enter password");
    const submitButton = screen.getByRole("button", {
      name: /reset password/i,
    });

    fireEvent.change(passwordInput, {
      target: { value: "newPassword123" },
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Password update failed");
    });
    expect(alertSpy).not.toHaveBeenCalled();
  });
});

// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import { type ReviewFormInputsSchema } from "@/common/tools/zod/schemas";

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    status: "authenticated",
    data: { user: { email: "student@smu.edu.sg" } },
  }),
}));

import { SubmitButtonGroup } from "./SubmitButtonGroup";

const Wrapper = ({ isLoading = false }: { isLoading?: boolean }) => {
  const methods = useForm<ReviewFormInputsSchema>();
  return (
    <FormProvider {...methods}>
      <SubmitButtonGroup isLoading={isLoading} />
    </FormProvider>
  );
};

describe("SubmitButtonGroup", () => {
  it("names the identity select trigger", () => {
    render(<Wrapper />);

    expect(
      screen.getByRole("combobox", { name: "Select submission identity" }),
    ).toBeInTheDocument();
  });

  it("names the submit button after the signed-in identity", () => {
    render(<Wrapper />);

    expect(
      screen.getByRole("button", { name: "Submit as student@smu.edu.sg" }),
    ).toBeInTheDocument();
  });
});

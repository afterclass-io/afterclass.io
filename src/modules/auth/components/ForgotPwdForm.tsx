"use client";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { supabaseBrowser } from "@/common/tools/supabase/client";
import { toast } from "sonner";

import { Button } from "@/common/components/button";
import { Form } from "@/common/components/form";
import { env } from "@/env";

import { getUserPlatform } from "../functions";
import { useNavigateWithProgress } from "../hooks/useNavigateWithProgress";
import {
  ForgotPwdFormActionReturnType,
  type ForgotPwdFormInputs,
  forgotPwdFormInputsSchema,
} from "../types";
import { ProgressLink } from "@/common/components/progress-link";
import { EmailField } from "./fields/EmailField";

export const ForgotPwdForm = () => {
  const navigateWithProgress = useNavigateWithProgress();

  const form = useForm<ForgotPwdFormInputs>({
    resolver: zodResolver(forgotPwdFormInputsSchema),
    mode: "onTouched",
    defaultValues: {
      email: "",
    },
  });

  const onSubmit: SubmitHandler<ForgotPwdFormInputs> = async ({ email }) => {
    const result = await getUserPlatform({ email });

    if (result === ForgotPwdFormActionReturnType.USER_NOT_FOUND) {
      form.setError("email", {
        type: "custom",
        message: "Invalid user or email. Please try again.",
      });
      return;
    }

    if (result === ForgotPwdFormActionReturnType.USER_ON_V1) {
      navigateWithProgress(
        `/account/auth/signup?${new URLSearchParams({ email })}`,
      );
      return;
    }

    const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
      redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/account/auth/reset-password`,
    });
    if (error) {
      toast.error(error.message);
      form.reset();
      return;
    }

    navigateWithProgress(
      `/account/auth/verify?${new URLSearchParams({ email })}`,
    );
  };

  return (
    <Form {...form}>
      <form
        className="flex w-full flex-col gap-6"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <EmailField
          control={form.control}
          name="email"
          label="School Email Address"
          placeholder="john.doe.2023@smu.edu.sg"
          tabIndex={1}
          dataTest="email"
          disabled={form.formState.isSubmitting}
        />
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          tabIndex={2}
          data-test="submit"
        >
          {form.formState.isSubmitting
            ? "Confirming your email..."
            : "Reset my password"}
        </Button>
        <div className="flex items-center gap-1 self-stretch md:text-base">
          <span className="text-muted-foreground text-center font-semibold">
            {"Don't have an account?"}
          </span>
          <ProgressLink
            href="/account/auth/signup"
            type="button"
            variant="link"
            tabIndex={3}
            data-test="register"
          >
            Create an account
          </ProgressLink>
        </div>
      </form>
    </Form>
  );
};

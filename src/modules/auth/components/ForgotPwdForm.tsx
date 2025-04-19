"use client";
import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { supabase } from "@/server/supabase";

import { Input } from "@/common/components/i-nput";
import { Button } from "@/common/components/button";
import { Form } from "@/common/components/form";
import { env } from "@/env";
import { EnvelopeIcon } from "@/common/components/icons";
import { useProgress } from "@/common/providers/ProgressProvider";

import { getUserPlatform } from "../functions";
import {
  ForgotPwdFormActionReturnType,
  type ForgotPwdFormInputs,
  forgotPwdFormInputsSchema,
} from "../types";
import { ProgressLink } from "@/common/components/Progress";

export const ForgotPwdForm = () => {
  const router = useRouter();
  const progress = useProgress();

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
      progress.start();

      startTransition(() => {
        router.push(`/account/auth/signup?email=${email}`);
        progress.done();
      });
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/account/auth/reset-password`,
    });
    if (error) {
      alert(error.message);
      form.reset();
      return;
    }

    progress.start();

    startTransition(() => {
      router.push(`/account/auth/verify?email=${email}`);
      progress.done();
    });
  };

  return (
    <Form {...form}>
      <form
        className="flex w-full flex-col gap-6"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Form.Field
          control={form.control}
          name="email"
          render={({ field }) => (
            <Form.Item>
              <Form.Label>School Email Address</Form.Label>
              <Form.Control>
                <Input
                  {...field}
                  disabled={form.formState.isSubmitting}
                  contentLeft={<EnvelopeIcon size={24} />}
                  placeholder="john.doe.2023@smu.edu.sg"
                  autoComplete="on"
                  tabIndex={1}
                  data-test="email"
                />
              </Form.Control>
              <Form.Message data-test="email-helper-text" />
            </Form.Item>
          )}
        />
        <div className="flex w-full flex-col items-start gap-2 self-stretch pt-3">
          <Button
            fullWidth
            type="submit"
            disabled={form.formState.isSubmitting}
            tabIndex={2}
            data-test="submit"
          >
            {form.formState.isSubmitting
              ? "Confirming your email..."
              : "Reset my password"}
          </Button>
          <div className="flex items-center gap-1 self-stretch text-xs md:text-base">
            <span className="text-text-em-mid text-center font-semibold">
              {"Don't have an account?"}
            </span>
            <ProgressLink
              href="/account/auth/signup"
              type="button"
              variant="link"
              isResponsive
              tabIndex={3}
              data-test="register"
            >
              Create an account
            </ProgressLink>
          </div>
        </div>
      </form>
    </Form>
  );
};

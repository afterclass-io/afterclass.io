"use client";
import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { supabase } from "@/server/supabase";

import {
  InputRoot,
  InputAdornment,
  InputControl,
  Input,
} from "@/common/components/input";
import { Button } from "@/common/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/common/components/form";
import { env } from "@/env";
import { EnvelopeIcon } from "@/common/components/icons";
import { useProgress } from "@/common/providers/ProgressProvider";

import { getUserPlatform } from "../functions";
import {
  ForgotPwdFormActionReturnType,
  type ForgotPwdFormInputs,
  forgotPwdFormInputsSchema,
} from "../types";
import { ProgressLink } from "@/common/components/progress-link";

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
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>School Email Address</FormLabel>
              <FormControl>
                <InputRoot>
                  <InputAdornment>
                    <EnvelopeIcon />
                  </InputAdornment>
                  <InputControl>
                    <Input
                      {...field}
                      disabled={form.formState.isSubmitting}
                      placeholder="john.doe.2023@smu.edu.sg"
                      autoComplete="on"
                      tabIndex={1}
                      data-test="email"
                    />
                  </InputControl>
                </InputRoot>
              </FormControl>
              <FormMessage data-test="email-helper-text" />
            </FormItem>
          )}
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

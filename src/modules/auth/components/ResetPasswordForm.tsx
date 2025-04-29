"use client";

import { startTransition, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { supabase } from "@/server/supabase";

import { Button } from "@/common/components/button";
import {
  PasswordInputRoot,
  PasswordInputAdornment,
  PasswordInputAdornmentToggle,
  PasswordInput,
} from "@/common/components/input-password";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/common/components/form";
import { LockIcon } from "@/common/components/icons";
import { useProgress } from "@/common/providers/ProgressProvider";

const resetPwdFormInputsSchema = z.object({
  password: z
    .string()
    .min(8, { message: "Passwords must be at least 8 characters long" }),
});
type ResetPwdFormInputs = z.infer<typeof resetPwdFormInputsSchema>;

export const ResetPasswordForm = () => {
  const router = useRouter();
  const progress = useProgress();
  const [isSubmitSuccessful, setIsSubmitSuccessful] = useState(false);
  const form = useForm<ResetPwdFormInputs>({
    resolver: zodResolver(resetPwdFormInputsSchema),
    mode: "onTouched",
    defaultValues: {
      password: "",
    },
  });
  const onSubmit: SubmitHandler<ResetPwdFormInputs> = async ({ password }) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      alert(error.message);
      form.reset();
      return;
    }
    setIsSubmitSuccessful(true);

    progress.start();
    startTransition(() => {
      router.push("/account/auth/login");
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
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <PasswordInputRoot>
                  <PasswordInputAdornment>
                    <LockIcon />
                  </PasswordInputAdornment>
                  <PasswordInput
                    {...field}
                    disabled={form.formState.isSubmitting}
                    placeholder="Enter password"
                    autoComplete="on"
                    tabIndex={1}
                  />
                  <PasswordInputAdornmentToggle />
                </PasswordInputRoot>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          tabIndex={2}
        >
          {form.formState.isSubmitting ? "Signing in..." : "Reset Password"}
        </Button>
        {isSubmitSuccessful && (
          <div className="text-green-500">
            Your password has been updated successfully.
          </div>
        )}
      </form>
    </Form>
  );
};

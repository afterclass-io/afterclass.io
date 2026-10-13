"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { supabaseBrowser } from "@/common/tools/supabase/client";
import { toast } from "sonner";

import { Button } from "@/common/components/button";
import { Form } from "@/common/components/form";
import { useNavigateWithProgress } from "../hooks/useNavigateWithProgress";
import { PasswordField } from "./fields/PasswordField";

const resetPwdFormInputsSchema = z.object({
  password: z
    .string()
    .min(8, { error: "Passwords must be at least 8 characters long" }),
});
type ResetPwdFormInputs = z.infer<typeof resetPwdFormInputsSchema>;

export const ResetPasswordForm = () => {
  const navigateWithProgress = useNavigateWithProgress();
  const [isSubmitSuccessful, setIsSubmitSuccessful] = useState(false);
  const form = useForm<ResetPwdFormInputs>({
    resolver: zodResolver(resetPwdFormInputsSchema),
    mode: "onTouched",
    defaultValues: {
      password: "",
    },
  });
  const onSubmit: SubmitHandler<ResetPwdFormInputs> = async ({ password }) => {
    const { error } = await supabaseBrowser.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
      form.reset();
      return;
    }
    setIsSubmitSuccessful(true);

    navigateWithProgress("/account/auth/login");
  };

  return (
    <Form {...form}>
      <form
        className="flex w-full flex-col gap-6"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <PasswordField
          control={form.control}
          name="password"
          label="New Password"
          placeholder="Enter password"
          tabIndex={1}
          disabled={form.formState.isSubmitting}
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

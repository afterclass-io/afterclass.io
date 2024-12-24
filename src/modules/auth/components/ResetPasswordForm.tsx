"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import PhLockSimple from "~icons/ph/lock-simple";
import PhEye from "~icons/ph/eye";
import PhEyeSlash from "~icons/ph/eye-slash";

import { supabase } from "@/server/supabase";

import { Input } from "@/common/components/Input";
import { Button } from "@/common/components/Button";
import { Form } from "@/common/components/Form";

const resetPwdFormInputsSchema = z.object({
  password: z
    .string()
    .min(8, { message: "Passwords must be at least 8 characters long" }),
});
type ResetPwdFormInputs = z.infer<typeof resetPwdFormInputsSchema>;

export const ResetPasswordForm = () => {
  const router = useRouter();
  const [isPwdVisible, setIsPwdVisible] = useState(false);
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
    router.push("/account/auth/login");
  };

  return (
    <Form {...form}>
      <form
        className="flex w-full flex-col gap-6"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Form.Field
          control={form.control}
          name="password"
          render={({ field }) => (
            <Form.Item>
              <Form.Label>New Password</Form.Label>
              <Form.Control>
                <Input
                  {...field}
                  disabled={form.formState.isSubmitting}
                  contentLeft={<PhLockSimple width={24} height={24} />}
                  contentRight={
                    <button
                      type="button"
                      onClick={() => setIsPwdVisible(!isPwdVisible)}
                      tabIndex={3}
                    >
                      {isPwdVisible ? (
                        <PhEyeSlash width={24} height={24} />
                      ) : (
                        <PhEye width={24} height={24} />
                      )}
                    </button>
                  }
                  placeholder="Enter password"
                  type={isPwdVisible ? "text" : "password"}
                  autoComplete="on"
                  tabIndex={1}
                />
              </Form.Control>
              <Form.Message />
            </Form.Item>
          )}
        />
        <div className="flex w-full flex-col items-start gap-2 self-stretch pt-3">
          <Button
            fullWidth
            type="submit"
            disabled={form.formState.isSubmitting}
            tabIndex={2}
          >
            {form.formState.isSubmitting ? "Signing in..." : "Reset Password"}
          </Button>
        </div>
        {isSubmitSuccessful && (
          <div className="text-green-500">
            Your password has been updated successfully.
          </div>
        )}
      </form>
    </Form>
  );
};

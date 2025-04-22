"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/common/components/button";
import {
  PasswordInputRoot,
  PasswordInputAdornment,
  PasswordInputAdornmentToggle,
  PasswordInput,
} from "@/common/components/input-password";
import {
  InputRoot,
  InputAdornment,
  InputControl,
  Input,
} from "@/common/components/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/common/components/form";
import { LockIcon, EnvelopeIcon } from "@/common/components/icons";
import { signUpWithEmail } from "@/server/supabase";
import { emailValidationSchema } from "@/common/tools/zod/schemas";
import { useProgress } from "@/common/providers/ProgressProvider";
import { ProgressLink } from "@/common/components/progress-link";

const signupFormInputsSchema = z
  .object({
    email: emailValidationSchema,
    password: z
      .string()
      .min(8, { message: "Passwords must be at least 8 characters long" }),
    confirmPassword: z
      .string()
      .min(8, { message: "Passwords must be at least 8 characters long" }),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (confirmPassword === password) return;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmPassword"],
      message: "Passwords did not match",
    });
  });
type SignupFormInputs = z.infer<typeof signupFormInputsSchema>;

export const SignupForm = ({ defaultEmail }: { defaultEmail?: string }) => {
  const router = useRouter();
  const progress = useProgress();

  const form = useForm<SignupFormInputs>({
    resolver: zodResolver(signupFormInputsSchema),
    mode: "onTouched",
    defaultValues: {
      email: defaultEmail ?? "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit: SubmitHandler<SignupFormInputs> = async (data) => {
    try {
      const res = await signUpWithEmail(data.email, data.password);
      if (res.error) throw new Error(res.error.message);
      if (!res.data.user?.user_metadata?.email_verified) {
        progress.start();
        startTransition(() => {
          router.push(`/account/auth/verify?email=${res.data.user?.email}`);
          progress.done();
        });
      } else {
        throw new Error(
          "trying to create user that already has email verified",
        );
      }
      form.reset();
    } catch (err) {
      alert(err);
    }
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
                    tabIndex={2}
                    data-test="password"
                  />
                  <PasswordInputAdornmentToggle />
                </PasswordInputRoot>
              </FormControl>
              <FormMessage data-test="password-helper-text" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <PasswordInputRoot>
                  <PasswordInputAdornment>
                    <LockIcon />
                  </PasswordInputAdornment>
                  <PasswordInput
                    {...field}
                    disabled={form.formState.isSubmitting}
                    placeholder="Confirm password"
                    autoComplete="on"
                    tabIndex={3}
                    data-test="confirm-password"
                  />
                  <PasswordInputAdornmentToggle />
                </PasswordInputRoot>
              </FormControl>
              <FormMessage data-test="confirm-password-helper-text" />
            </FormItem>
          )}
        />
        <div className="flex w-full flex-col items-start gap-2 self-stretch pt-3">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            tabIndex={4}
            data-test="submit"
          >
            {form.formState.isSubmitting ? "Creating an account..." : "Sign up"}
          </Button>
          <div className="flex items-center gap-1 self-stretch text-xs md:text-base">
            <span className="text-muted-foreground text-center font-semibold">
              Already have an account?
            </span>
            <ProgressLink
              href="/account/auth/login"
              type="button"
              variant="link"
              tabIndex={7}
            >
              Login
            </ProgressLink>
          </div>
        </div>
      </form>
    </Form>
  );
};

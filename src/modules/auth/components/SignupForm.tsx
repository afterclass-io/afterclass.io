"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/common/components/button";
import { Input, InputIcon, InputRoot } from "@/common/components/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/common/components/form";
import {
  LockIcon,
  EyeIcon,
  EyeSlashIcon,
  EnvelopeIcon,
} from "@/common/components/icons";
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
  const [isPwdVisible, setIsPwdVisible] = useState(false);
  const [isCfmPwdVisible, setIsCfmPwdVisible] = useState(false);

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
                  <InputIcon>
                    <EnvelopeIcon />
                  </InputIcon>
                  <Input
                    {...field}
                    disabled={form.formState.isSubmitting}
                    placeholder="john.doe.2023@smu.edu.sg"
                    autoComplete="on"
                    tabIndex={1}
                    data-test="email"
                  />
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
                <InputRoot>
                  <InputIcon>
                    <LockIcon />
                  </InputIcon>
                  <Input
                    {...field}
                    disabled={form.formState.isSubmitting}
                    placeholder="Enter password"
                    type={isPwdVisible ? "text" : "password"}
                    autoComplete="on"
                    tabIndex={2}
                    data-test="password"
                  />
                  <InputIcon>
                    <button
                      type="button"
                      onClick={() => setIsPwdVisible(!isPwdVisible)}
                      tabIndex={4}
                    >
                      {isPwdVisible ? (
                        <EyeSlashIcon size={24} />
                      ) : (
                        <EyeIcon size={24} />
                      )}
                    </button>
                  </InputIcon>
                </InputRoot>
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
                <InputRoot>
                  <InputIcon>
                    <LockIcon />
                  </InputIcon>
                  <Input
                    {...field}
                    disabled={form.formState.isSubmitting}
                    placeholder="Confirm password"
                    type={isCfmPwdVisible ? "text" : "password"}
                    autoComplete="on"
                    tabIndex={3}
                    data-test="confirm-password"
                  />
                  <InputIcon>
                    <button
                      type="button"
                      onClick={() => setIsCfmPwdVisible(!isCfmPwdVisible)}
                      tabIndex={6}
                    >
                      {isCfmPwdVisible ? (
                        <EyeSlashIcon size={24} />
                      ) : (
                        <EyeIcon size={24} />
                      )}
                    </button>
                  </InputIcon>
                </InputRoot>
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import PhEye from "~icons/ph/eye";
import PhEyeSlash from "~icons/ph/eye-slash";
import PhEnvelopeSimple from "~icons/ph/envelope-simple";
import PhLockSimple from "~icons/ph/lock-simple";

import { Button } from "@/common/components/Button";
import { Input } from "@/common/components/Input";
import { Form } from "@/common/components/Form";

import { signUpWithEmail } from "@/server/supabase";
import { emailValidationSchema } from "@/common/tools/zod/schemas";

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
        router.push(`/account/auth/verify?email=${res.data.user?.email}`);
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
                  contentLeft={<PhEnvelopeSimple width={24} height={24} />}
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
                      tabIndex={5}
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
                  tabIndex={2}
                  data-test="password"
                />
              </Form.Control>
              <Form.Message data-test="password-helper-text" />
            </Form.Item>
          )}
        />
        <Form.Field
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <Form.Item>
              <Form.Label>Confirm Password</Form.Label>
              <Form.Control>
                <Input
                  {...field}
                  disabled={form.formState.isSubmitting}
                  contentLeft={<PhLockSimple width={24} height={24} />}
                  contentRight={
                    <button
                      type="button"
                      onClick={() => setIsCfmPwdVisible(!isCfmPwdVisible)}
                      tabIndex={6}
                    >
                      {isCfmPwdVisible ? (
                        <PhEyeSlash width={24} height={24} />
                      ) : (
                        <PhEye width={24} height={24} />
                      )}
                    </button>
                  }
                  placeholder="Confirm password"
                  type={isCfmPwdVisible ? "text" : "password"}
                  autoComplete="on"
                  tabIndex={3}
                  data-test="confirm-password"
                />
              </Form.Control>
              <Form.Message data-test="confirm-password-helper-text" />
            </Form.Item>
          )}
        />
        <div className="flex w-full flex-col items-start gap-2 self-stretch pt-3">
          <Button
            fullWidth
            type="submit"
            disabled={form.formState.isSubmitting}
            isResponsive
            tabIndex={4}
            data-test="submit"
          >
            {form.formState.isSubmitting ? "Creating an account..." : "Sign up"}
          </Button>
          <div className="flex items-center gap-1 self-stretch text-xs md:text-base">
            <span className="text-center font-semibold text-text-em-mid">
              Already have an account?
            </span>
            <Button
              type="button"
              variant="link"
              as="a"
              href="/account/auth/login"
              isResponsive
              tabIndex={7}
            >
              Login
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};

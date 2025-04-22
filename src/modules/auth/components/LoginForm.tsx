"use client";
import { startTransition, useEffect, Fragment } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/common/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/common/components/form";
import { LockIcon, EnvelopeIcon } from "@/common/components/icons";
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
import { emailValidationSchema } from "@/common/tools/zod/schemas";
import { useProgress } from "@/common/providers/ProgressProvider";
import { ProgressLink } from "@/common/components/progress-link";
import { toast } from "sonner";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { env } from "@/env";

const loginFormInputsSchema = z.object({
  email: emailValidationSchema,
  password: z
    .string()
    .min(8, { message: "Passwords must be at least 8 characters long" }),
});
type LoginFormInputs = z.infer<typeof loginFormInputsSchema>;

export const LoginForm = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const progress = useProgress();

  const form = useForm<LoginFormInputs>({
    resolver: zodResolver(loginFormInputsSchema),
    mode: "onTouched",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const authJsError = searchParams?.get("error");
    if (authJsError) {
      toast.warning("Invalid Credentials", {
        id: authJsError,
        description: (
          <>
            <span>
              Please try again with an email from the supported domains:
            </span>
            <span className="mt-1 flex flex-wrap gap-1">
              {env.NEXT_PUBLIC_SUPPORTED_SCH_DOMAINS.map((domain, i) => (
                <Fragment key={i}>
                  {i > 0 && <span className="mr-1">,</span>}
                  <span className="before:bg-border-primary/15 relative inline-block before:absolute before:-inset-[2px] before:my-[5px]">
                    <pre className="text-text-on-secondary inline">
                      {domain}
                    </pre>
                  </span>
                </Fragment>
              ))}
            </span>
          </>
        ),
      });
      return;
    }

    if (!window.location.hash.startsWith("#")) return;

    const params = new URLSearchParams(window.location.hash.substring(1));
    const supabaseErrorDescription = params.get("error_description");
    if (!supabaseErrorDescription) return;

    // TODO: use a better way to display error messages
    form.setError("password", {
      type: "custom",
      message: supabaseErrorDescription,
    });

    // why does this effect depend on searchParams?
    // this is a quick hack to watch for changes in the url fragment as
    // next does not provide a way to watch for changes in the url fragment.
    // the searchParams is somehow conveniently updated when url fragment is updated,
    // which triggers this effect
    // see https://github.com/orgs/supabase/discussions/12939
    // see https://github.com/vercel/next.js/discussions/49465
  }, [searchParams]);

  const onSubmit: SubmitHandler<LoginFormInputs> = async ({
    email,
    password,
  }) => {
    const callbackUrl = searchParams?.get("callbackUrl") ?? "/";
    const signinResp = await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
      redirect: false,
    });

    if (!signinResp) {
      console.warn("Sign in returned null");
      return;
    }

    if (signinResp.error) {
      form.setError("password", {
        type: "custom",
        message: "Invalid email or password. Please try again.",
      });
      return;
    }

    progress.start();
    startTransition(() => {
      router.push(signinResp.url ?? callbackUrl);
      router.refresh();
      progress.done();
    });
  };

  return (
    <Form {...form}>
      <form
        className="flex w-full flex-col gap-4 md:gap-6"
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
              <FormLabel className="flex items-center justify-between">
                <span>Password</span>
                <ProgressLink
                  href="/account/auth/forgot"
                  variant="link"
                  className="md:text-sm"
                  tabIndex={5}
                  data-test="forget"
                >
                  Forgot password?
                </ProgressLink>
              </FormLabel>
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
        <div className="flex w-full flex-col items-start gap-4 self-stretch pt-3">
          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
            tabIndex={3}
            data-test="submit"
          >
            {form.formState.isSubmitting ? "Signing in..." : "Login"}
          </Button>
          <div className="before:bg-border after:bg-border mx-auto my-2 flex w-full items-center justify-evenly before:mr-4 before:block before:h-px before:flex-grow after:ml-4 after:block after:h-px after:flex-grow">
            OR
          </div>

          <GoogleSignInButton
            googleSignInOptions={{
              callbackUrl: searchParams?.get("callbackUrl") ?? "/",
            }}
            onResponse={(resp) => {
              if (!resp) {
                console.warn("Google sign in returned null");
                return;
              }

              if (resp?.error) {
                console.error("Google sign in error:", resp.error);
                return;
              }

              console.log("Google sign in response:", resp);

              progress.start();
              startTransition(() => {
                router.push(resp?.url ?? "/");
                router.refresh();
                progress.done();
              });
            }}
          >
            Sign in with Google
          </GoogleSignInButton>

          <div className="flex items-center gap-1 self-stretch text-xs md:text-base">
            <span className="text-muted-foreground text-center">
              {"Don't have an account?"}
            </span>
            <ProgressLink
              href="/account/auth/signup"
              type="button"
              variant="link"
              tabIndex={6}
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

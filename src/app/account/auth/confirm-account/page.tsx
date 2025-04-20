import { Button } from "@/common/components/button";
import { ProgressLink } from "@/common/components/progress-link";
import { AuthCard } from "@/modules/auth/components";
import { notFound } from "next/navigation";
import { z } from "zod";

const CONFIRMATION_TEXTS = {
  signup: {
    title: "Thank you for your registration!",
    description:
      "Please click on the button below to complete your sign up process.",
    button: "Confirm Sign Up",
  },
  recovery: {
    title: "Confirm your password reset",
    description:
      "Please click on the button below to complete your password reset.",
    button: "Confirm Reset Password",
  },
} as const;

type ConfirmationType = keyof typeof CONFIRMATION_TEXTS;

export default async function ConfirmSignUp(props: {
  searchParams: Promise<{ confirmation_url: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const confirmationUrlSchema = z
    .string()
    .url()
    .refine((url) => {
      try {
        const urlObject = new URL(url);
        return urlObject.searchParams?.has("type");
      } catch {
        return false;
      }
    });

  const confirmationUrl = searchParams?.confirmation_url;
  const parseResult = confirmationUrlSchema.safeParse(confirmationUrl);
  if (!parseResult.success) {
    notFound();
  }

  const validatedUrl = parseResult.data;
  const type = new URL(validatedUrl).searchParams?.get(
    "type",
  ) as ConfirmationType;

  if (!CONFIRMATION_TEXTS[type]) {
    notFound();
  }

  const { title, description, button } = CONFIRMATION_TEXTS[type];

  return (
    <AuthCard title={title}>
      <div className="text-accent-foreground flex w-full flex-col gap-6 pb-3">
        <p>{description}</p>
        {!validatedUrl ? (
          <ProgressLink href={validatedUrl}>{button}</ProgressLink>
        ) : (
          <Button disabled>{button}</Button>
        )}
      </div>
    </AuthCard>
  );
}

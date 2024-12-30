"use client";
import { Button } from "@/common/components/Button";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/common/components/AlertDialog";

import { ProgressLink } from "@/common/components/Progress";
import { env } from "@/env";

export const ResetV1UserAlertDialog = () => (
  <AlertDialog defaultOpen>
    <AlertDialogTrigger asChild>
      <Button>Open</Button>
    </AlertDialogTrigger>
    <AlertDialogContent
      data-test="v1-signup-alert-dialog"
      onOpenAutoFocus={(event) => event.preventDefault()}
    >
      <AlertDialogHeader>
        <AlertDialogTitle>
          <div>⚠️ Important Notice ⚠️</div>
        </AlertDialogTitle>
        <AlertDialogDescription>
          <div className="space-y-2 text-xs md:space-y-4 md:text-base">
            <div>
              It looks like you are trying to reset your password for the&nbsp;
              <ProgressLink
                href={env.NEXT_PUBLIC_OLD_SITE_URL}
                variant="link"
                className="inline-flex h-fit p-0 pb-[1px] text-[length:inherit] text-text-em-mid underline hover:text-secondary-default md:h-fit md:p-0"
                external
              >
                old AfterClass website.
              </ProgressLink>
            </div>
            <p>
              As we migrate to a new platform, users from the old AfterClass
              website can still
              <b className="ml-1 text-text-em-mid">
                access the new AfterClass platform using the same email and
                password.
              </b>
            </p>
            <p>
              <b className="mr-1 text-text-em-mid">NOTE:</b>
              Password resets will not work for accounts created on the old
              AfterClass website on the new AfterClass platform.
            </p>
            <p>
              <b className="ml-r text-text-em-mid">Forgot your password?</b> No
              worries! Just create a new account using the same email.
            </p>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="gap-2 sm:flex-col-reverse sm:space-x-0">
        <AlertDialogCancel asChild className="w-full">
          <Button fullWidth>Create a new account</Button>
        </AlertDialogCancel>
        <AlertDialogAction asChild className="w-full">
          <ProgressLink href="/account/auth/login" variant="tertiary" fullWidth>
            Login with old AfterClass account
          </ProgressLink>
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

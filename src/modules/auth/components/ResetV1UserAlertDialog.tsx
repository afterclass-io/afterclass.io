"use client";
import { Button } from "@/common/components/button";

import {
  AlertDialog,
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
                className="text-text-em-mid hover:text-secondary-default inline-flex h-fit p-0 pb-[1px] text-[length:inherit] underline md:h-fit md:p-0"
                external
              >
                old AfterClass website.
              </ProgressLink>
            </div>
            <p>
              As we migrate to a new platform, users from the old AfterClass
              website can still
              <b className="text-text-em-mid ml-1">
                access the new AfterClass platform using the same email and
                password.
              </b>
            </p>
            <p>
              <b className="text-text-em-mid mr-1">NOTE:</b>
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

import type { Meta, StoryObj } from "@storybook/react";

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
} from "./alert-dialog";
import { Button } from "@/common/components/button";
import { ProgressLink } from "@/common/components/progress-link";
import { env } from "@/env";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/AlertDialog",
  component: AlertDialog,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {},
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button>Open Default</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

export const ResetV1UserAlertDialog: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button>Open V1 User Reset Password</Button>
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
                It looks like you are trying to reset your password for
                the&nbsp;
                <ProgressLink
                  href={env.NEXT_PUBLIC_OLD_SITE_URL}
                  target="_blank"
                  className="text-muted-foreground hover:text-secondary-default inline-flex h-fit p-0 pb-[1px] text-[length:inherit] underline md:h-fit md:p-0"
                >
                  old AfterClass website.
                </ProgressLink>
              </div>
              <p>
                As we migrate to a new platform, users from the old AfterClass
                website can still
                <b className="text-muted-foreground ml-1">
                  access the new AfterClass platform using the same email and
                  password.
                </b>
              </p>
              <p>
                <b className="text-muted-foreground mr-1">NOTE:</b>
                Password resets will not work for accounts created on the old
                AfterClass website on the new AfterClass platform.
              </p>
              <p>
                <b className="ml-r text-muted-foreground">
                  Forgot your password?
                </b>{" "}
                No worries! Just create a new account using the same email.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:flex-col-reverse sm:space-x-0">
          <AlertDialogCancel asChild className="w-full">
            <Button>Create a new account</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild className="w-full">
            <ProgressLink href="/account/auth/login">
              Login with old AfterClass account
            </ProgressLink>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

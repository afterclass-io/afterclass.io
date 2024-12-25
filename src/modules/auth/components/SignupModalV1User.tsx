"use client";
import { Button } from "@/common/components/Button";
import { Modal } from "@/common/components/Modal";
import { ProgressLink } from "@/common/components/Progress";
import { env } from "@/env";

export const SignupModalV1User = () => (
  <Modal defaultOpen>
    <Modal.Content
      onOpenAutoFocus={(e) => e.preventDefault()}
      data-test="v1-signup-modal"
    >
      <Modal.Header>⚠️ Important Notice ⚠️</Modal.Header>
      <Modal.Body>
        <div className="space-y-2 text-xs md:space-y-4 md:text-base">
          <div className="flex flex-col items-start md:flex-row md:items-center">
            <span className="mr-1">
              It looks like you are trying to reset your password for the
            </span>
            <ProgressLink
              href={env.NEXT_PUBLIC_OLD_SITE_URL}
              variant="link"
              className="inline-flex h-fit p-0 pb-[1px] text-text-em-high underline hover:text-secondary-default md:h-fit md:p-0"
              external
              isResponsive
            >
              old AfterClass website.
            </ProgressLink>
          </div>
          <p>
            As we migrate to a new platform, users from the old AfterClass
            website can still
            <b className="ml-1 text-text-em-high">
              access the new AfterClass platform using the same email and
              password.
            </b>
          </p>
          <p>
            {/* <b className="mr-1 text-text-em-high">NOTE:</b> */}
            Password resets will not work for accounts created on the old
            AfterClass website on the new AfterClass platform.
          </p>
          <p>
            <b className="ml-r text-text-em-high">Forgot your password?</b> No
            worries! Just create a new account using the same email.
          </p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Modal.Close asChild>
          <Button fullWidth>Create a new account</Button>
        </Modal.Close>
        <ProgressLink href="/account/auth/login" variant="tertiary" fullWidth>
          Login with old AfterClass account
        </ProgressLink>
      </Modal.Footer>
    </Modal.Content>
  </Modal>
);

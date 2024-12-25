import { AuthCard } from "@/modules/auth/components";
import { Button } from "@/common/components/Button";
import Heading from "@/common/components/Heading";
import { notFound } from "next/navigation";
import { env } from "@/env";
import { Fragment } from "react";

export default function Verify({
  searchParams,
}: {
  searchParams?: {
    email?: string;
  };
}) {
  if (!searchParams?.email) {
    return notFound();
  }

  return (
    <AuthCard title="You’re almost there!">
      <div className="flex flex-col gap-6 pb-3 text-xs leading-relaxed text-text-em-mid md:text-base">
        <div>
          <p>We’ve sent a verification email to:</p>
          <Heading
            as="h2"
            className="mt-1 text-base font-semibold tracking-wide md:text-xl"
          >
            {searchParams.email}
          </Heading>
        </div>
        <p>
          Please click on the link in that email to verify your account within{" "}
          <br className="hidden md:block" />
          20 minutes.
        </p>
        <hr className="my-1 border-border-default md:my-3" />
        <p>
          If you are not receiving AfterClass emails, try these troubleshooting
          steps:
        </p>
        <ol className="flex list-decimal flex-col gap-3 pl-5 md:pl-10">
          <li className="">
            <b className="text-text-em-high">
              Ensure the correct email address was used to register with
              AfterClass.{" "}
            </b>
            <span>We currently only support emails from these domains: </span>
            <span className="flex gap-1">
              {env.NEXT_PUBLIC_SUPPORTED_SCH_DOMAINS.map((domain, i) => (
                <Fragment key={i}>
                  {i > 0 && <span className="mr-1">,</span>}
                  <span className="relative inline-block before:absolute before:-inset-[2px] before:my-[5px] before:bg-border-primary/15">
                    <pre className="inline text-text-on-secondary">
                      {domain}
                    </pre>
                  </span>
                </Fragment>
              ))}
            </span>
          </li>
          <li>
            <b className="text-text-em-high">
              Check the spam or junk folder in your email inbox.{" "}
            </b>
            Occasionally, your mail service provider might incorrectly flag the
            login links as spam. If so, mark the email as not spam in your
            inbox.
          </li>
          <li>
            <b className="text-text-em-high">
              <span>Add the </span>
              <Button
                as="a"
                href="mailto:noreply@afterclass.io"
                variant="link"
                className="inline text-xs md:text-base"
              >
                noreply@afterclass.io
              </Button>
              <span> email and the </span>
              <Button
                as="a"
                href="https://afterclass.io"
                variant="link"
                className="inline text-xs md:text-base"
              >
                afterclass.io
              </Button>
              <span> domain to your email service’s safe senders list. </span>
            </b>
            As an additional measure, adding AfterClass’s email and domain will
            further help reduce the likelihood of emails being flagged as spam.
          </li>
        </ol>
        <p>
          <span>Still having trouble? </span>
          <b className="text-text-em-high">Reach out to us via Telegram </b>
          <Button
            as="a"
            href={env.NEXT_PUBLIC_AC_HELPDESK_LINK}
            variant="link"
            className="inline text-xs md:text-base"
            external
          >
            @afterclass
          </Button>
        </p>
      </div>
    </AuthCard>
  );
}

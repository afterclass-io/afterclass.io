import { AuthCard } from "@/modules/auth/components";
import { buttonVariants } from "@/common/components/button";
import { Heading } from "@/common/components/heading";
import { notFound } from "next/navigation";
import { env } from "@/env";
import { Fragment } from "react";
import Link from "next/link";
import { cn } from "@/common/functions";

export default async function Verify(props: {
  searchParams?: Promise<{
    email?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  if (!searchParams?.email) {
    return notFound();
  }

  return (
    <AuthCard title="You’re almost there!">
      <div className="text-muted-foreground flex flex-col gap-6 leading-relaxed md:text-base">
        <div>
          <p>We’ve sent a verification email to:</p>
          <Heading
            as="h2"
            className="mt-1 text-base font-semibold tracking-wide md:text-xl"
          >
            {searchParams?.email}
          </Heading>
        </div>
        <p>
          Please click on the link in that email to verify your account within{" "}
          <br className="hidden md:block" />
          20 minutes.
        </p>
        <hr className="border-border-default my-1 md:my-3" />
        <p>
          If you are not receiving AfterClass emails, try these troubleshooting
          steps:
        </p>
        <ol className="flex list-decimal flex-col gap-3 pl-5 md:pl-8">
          <li className="pl-2">
            <span className="text-accent-foreground">
              Ensure the correct email address was used to register with
              AfterClass.{" "}
            </span>
            <span>We currently only support emails from these domains: </span>
            <span className="flex gap-1">
              {env.NEXT_PUBLIC_SUPPORTED_SCH_DOMAINS.map((domain, i) => (
                <Fragment key={i}>
                  {i > 0 && <span className="mr-1">,</span>}
                  <span className="before:bg-border-primary/15 relative inline-block before:absolute before:-inset-[2px] before:my-[5px]">
                    <pre className="text-secondary-foreground inline">
                      {domain}
                    </pre>
                  </span>
                </Fragment>
              ))}
            </span>
          </li>
          <li className="pl-2">
            <span className="text-accent-foreground">
              Check the spam or junk folder in your email inbox.{" "}
            </span>
            Occasionally, your mail service provider might incorrectly flag the
            login links as spam. If so, mark the email as not spam in your
            inbox.
          </li>
          <li className="pl-2">
            <span className="text-accent-foreground">
              <span>Add the </span>
              <a
                href="mailto:noreply@afterclass.io"
                className={cn(
                  buttonVariants({
                    variant: "link",
                    className: "inline p-0 md:text-base",
                  }),
                )}
              >
                noreply@afterclass.io
              </a>
              <span> email and the </span>
              <Link
                href="https://afterclass.io"
                className={cn(
                  buttonVariants({
                    variant: "link",
                    className: "inline p-0 md:text-base",
                  }),
                )}
              >
                afterclass.io
              </Link>
              <span> domain to your email service’s safe senders list. </span>
            </span>
            As an additional measure, adding AfterClass’s email and domain will
            further help reduce the likelihood of emails being flagged as spam.
          </li>
        </ol>
      </div>
    </AuthCard>
  );
}

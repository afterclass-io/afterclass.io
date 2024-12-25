import { NoticeCard } from "@/common/components/NoticeCard";
import { ProgressLink } from "@/common/components/Progress";
import { env } from "@/env";

export default function NotFound() {
  return (
    <div className="flex justify-center p-6 md:h-full md:items-center md:p-12">
      <NoticeCard title="Not Found" isError>
        <ProgressLink
          href="/"
          variant="link"
          className="inline text-[length:inherit]"
        >
          Click here to return to Home.
        </ProgressLink>
        <span className="inline">Otherwise, you can get help from us</span>
        <ProgressLink
          href={env.NEXT_PUBLIC_AC_HELPDESK_LINK}
          variant="link"
          className="inline px-1 text-[length:inherit]"
          external
        >
          @afterclass
        </ProgressLink>
        <span className="inline">on Telegram.</span>
      </NoticeCard>
    </div>
  );
}

import Link from "next/link";

import { auth } from "@/server/auth";

import { SidebarTrigger } from "@/common/components/Sidebar";
import { Separator } from "@/common/components/Separator";
import { Breadcrumb } from "@/modules/home/components/Breadcrumb";
import { Button } from "@/common/components/Button";
import { ThemeToggle } from "@/common/components/ThemeToggle";
import { AfterclassIcon, SearchIcon } from "@/common/components/CustomIcon";
import { SearchCmdk } from "@/modules/search/components/SearchCmdk";
import { ProgressLink } from "@/common/components/Progress";

export const CoreLayoutHeader = async () => {
  const session = await auth();
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border-default px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 hidden h-4 bg-border-elevated md:block"
      />
      <div className="flex w-full items-center justify-between">
        <Breadcrumb className="hidden md:block" />
        <Link href="/" className="text-primary-default">
          <AfterclassIcon
            className="block text-primary-default md:hidden"
            size={20}
          />
        </Link>
        <div className="flex items-center gap-4">
          {session ? (
            <>
              <div className="hidden items-center gap-2 md:flex">
                <div className="overflow-hidden text-ellipsis text-sm text-text-em-mid">
                  <div className="h-4 w-4 rounded-full bg-cyan-800"></div>
                </div>
                <div>{session.user.email}</div>
              </div>
              <div className="block md:hidden">
                <SearchCmdk asChild>
                  <SearchIcon className="text-text-on-tertiary" size={20} />
                </SearchCmdk>
              </div>
            </>
          ) : (
            <ProgressLink
              variant="secondary"
              href="/account/auth/login"
              data-test="login"
            >
              Login
            </ProgressLink>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

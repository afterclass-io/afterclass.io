import { auth } from "@/server/auth";

import { SidebarTrigger } from "@/common/components/Sidebar";
import { Separator } from "@/common/components/Separator";
import { ThemeToggle } from "@/common/components/ThemeToggle";
import { AfterclassIcon, SearchIcon } from "@/common/components/CustomIcon";

import { Breadcrumb } from "@/modules/home/components/Breadcrumb";
import { SearchCmdk } from "@/modules/search/components/SearchCmdk";

import { CoreLayoutLoginButton } from "../CoreLayoutLoginButton";
import { Button } from "@/common/components/Button";
import { ProgressLink } from "@/common/components/Progress";
import { UserProfile } from "@/common/components/UserProfile/UserProfile";

export const CoreLayoutHeader = async () => {
  const session = await auth();
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b border-border-default bg-bg-base px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 hidden h-4 bg-border-elevated md:block"
      />
      <div className="flex w-full items-center justify-between">
        <Breadcrumb className="hidden md:block" />
        <ProgressLink
          href="/"
          variant="ghost"
          aria-label="Home"
          className="flex md:hidden"
          iconLeft={<AfterclassIcon className="text-primary-default" />}
        />
        <div className="flex items-center gap-4 md:mr-4">
          {session ? (
            <>
              <UserProfile user={session.user} />
              <div className="block md:hidden">
                <SearchCmdk asChild>
                  <Button
                    variant="ghost"
                    aria-label="Search"
                    iconLeft={<SearchIcon className="text-text-on-tertiary" />}
                  />
                </SearchCmdk>
              </div>
            </>
          ) : (
            <CoreLayoutLoginButton />
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

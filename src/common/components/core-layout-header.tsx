import { auth } from "@/server/auth";

import { SidebarTrigger } from "@/common/components/sidebar";
import { Separator } from "@/common/components/separator";
import { ThemeToggle } from "@/common/components/theme-toggle";
import { AfterclassIcon, SearchIcon } from "@/common/components/icons";

import { HomeBreadcrumb } from "@/modules/home/components/Breadcrumb";
import { SearchCmdk } from "@/modules/search/components/SearchCmdk";

import { CoreLayoutLoginButton } from "./core-layout-login-button";
import { Button } from "@/common/components/button";
import { ProgressLink } from "@/common/components/progress-link";
import { UserProfile } from "@/common/components/user-profile";

export const CoreLayoutHeader = async () => {
  const session = await auth();
  return (
    <header className="border-border-default bg-background sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="bg-border-elevated mr-2 hidden h-4 md:block"
      />
      <div className="flex w-full items-center justify-between">
        <HomeBreadcrumb className="hidden md:block" />
        <ProgressLink
          href="/"
          variant="ghost"
          aria-label="Home"
          className="flex md:hidden"
        >
          <AfterclassIcon className="text-primary-default" />
        </ProgressLink>
        <div className="flex items-center gap-4 md:mr-4">
          {session ? (
            <>
              <UserProfile user={session.user} />
              <div className="block md:hidden">
                <SearchCmdk asChild>
                  <Button variant="outline" size="icon" aria-label="Search">
                    <SearchIcon className="text-text-on-tertiary" />
                  </Button>
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

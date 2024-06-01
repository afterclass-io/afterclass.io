import { type PropsWithChildren } from "react";
import { Sidebar } from "../Sidebar";
import { MobileHeader } from "@/common/components/MobileHeader";
import { SearchCmdk } from "@/common/components/SearchCmdk/SearchCmdk";

interface CoreLayoutProps extends PropsWithChildren {}

export const CoreLayout = ({ children }: CoreLayoutProps) => {
  return (
    <>
      <SearchCmdk />
      <div className="relative flex h-full flex-col">
        <MobileHeader className="flex-shrink-0 sm:hidden" />
        <div className="relative flex h-full flex-col overflow-hidden sm:flex-row">
          <aside className="relative hidden overflow-y-auto border-r border-border-default bg-surface-base sm:block">
            <Sidebar />
          </aside>
          <main className="relative h-full flex-1 bg-bg-base">{children}</main>
        </div>
      </div>
    </>
  );
};

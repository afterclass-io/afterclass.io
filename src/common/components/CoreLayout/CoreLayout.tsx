import { type PropsWithChildren } from "react";
import { AppSidebar } from "@/modules/home/components/AppSidebar";
import { AnnouncementBanner } from "@/modules/home/components/AnnouncementBanner";
import { SidebarProvider, SidebarInset } from "@/common/components/Sidebar";
import { CoreLayoutHeader } from "./CoreLayoutHeader";
import { ScrollToTopButton } from "@/common/components/ScrollToTopButton";

// interface CoreLayoutProps extends PropsWithChildren {}
type CoreLayoutProps = PropsWithChildren;

export async function CoreLayout({ children }: CoreLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <CoreLayoutHeader />
        <AnnouncementBanner />
        <div id="scroll-to-top"></div>
        <div className="flex flex-1 flex-col">{children}</div>
        <ScrollToTopButton />
      </SidebarInset>
    </SidebarProvider>
  );
}

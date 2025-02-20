import { type PropsWithChildren } from "react";
import { AppSidebar } from "@/modules/home/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/common/components/Sidebar";
import dynamic from "next/dynamic";
import { CoreLayoutHeader } from "./CoreLayoutHeader";

const AnnouncementBanner = dynamic(
  () =>
    import("@/modules/home/components/AnnouncementBanner").then(
      (mod) => mod.AnnouncementBanner,
    ),
  {
    ssr: false,
  },
);

// interface CoreLayoutProps extends PropsWithChildren {}
type CoreLayoutProps = PropsWithChildren;

export async function CoreLayout({ children }: CoreLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <CoreLayoutHeader />
        <AnnouncementBanner />
        <div className="flex flex-1 flex-col" data-test="scrollable">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

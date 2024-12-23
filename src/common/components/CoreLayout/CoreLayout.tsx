import { type PropsWithChildren } from "react";
import { AppSidebar } from "@/modules/home/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/common/components/Sidebar";
import dynamic from "next/dynamic";
import { CoreLayoutHeader } from "@/common/components/CoreLayout/CoreLayoutHeader";

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
    <SidebarProvider className="h-dvh">
      <AppSidebar />
      <SidebarInset>
        <CoreLayoutHeader />
        <AnnouncementBanner />
        <section className="h-full overflow-y-scroll" data-test="scrollable">
          {children}
        </section>
      </SidebarInset>
    </SidebarProvider>
  );
}

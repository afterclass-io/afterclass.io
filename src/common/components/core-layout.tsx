import { type PropsWithChildren } from "react";
import { AppSidebar } from "@/modules/home/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/common/components/sidebar";
import { CoreLayoutHeader } from "@/common/components/core-layout-header";
import { ScrollToTopButton } from "@/common/components/scroll-to-top-button";

// interface CoreLayoutProps extends PropsWithChildren {}
type CoreLayoutProps = PropsWithChildren;

/**
 * Composes the application shell with navigation, header, content, and scroll controls.
 *
 * @param children - The content rendered in the main area
 */
export async function CoreLayout({ children }: CoreLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <CoreLayoutHeader />
        <div id="scroll-to-top"></div>
        <div className="flex flex-1 flex-col">{children}</div>
        <ScrollToTopButton />
      </SidebarInset>
    </SidebarProvider>
  );
}

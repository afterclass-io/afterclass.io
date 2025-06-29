"use client";
import * as React from "react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroupLabel,
  SidebarFooter,
} from "@/common/components/sidebar";
import { Logo } from "@/common/components/logo";
import {
  ChartLineIcon,
  GithubIcon,
  HelpDeskIcon,
  PlusIcon,
  StarLineAltIcon,
  StatisticsTableIcon,
  TableIcon,
  TelegramIcon,
} from "@/common/components/icons";
import { env } from "@/env";
import { toTitleCase } from "@/common/functions";
import Link from "next/link";
import { SearchCmdk } from "@/modules/search/components/SearchCmdk";
import { usePathname } from "next/navigation";
import { useIsMobile } from "@/common/hooks";
import { ProgressLink } from "@/common/components/progress-link";

type SidebarItemType = {
  label: string;
  icon: React.ReactNode;
  href: string;
  external?: boolean;
  target?: string;
  showMobileOnly?: boolean;
  devOnly?: boolean;
};

type SidebarCategoryType = {
  main: SidebarItemType[]; // Ensure "main" is always required
  [key: string]: SidebarItemType[];
};

const SIDEBAR_CATEGORY_ITEMS: SidebarCategoryType = {
  main: [
    {
      label: "Reviews",
      icon: <StarLineAltIcon size={16} />,
      href: "/",
    },
    {
      label: "Bid Analytics",
      icon: <ChartLineIcon />,
      href: "/bidding",
    },
    {
      label: "Bid History",
      icon: <TableIcon />,
      href: "/bidding/history",
    },
    // Development-only links
    ...(process.env.NODE_ENV === "development" ? [] : []),
  ],
  contribute: [
    {
      label: "Write a Review",
      icon: <PlusIcon size={16} />,
      href: "/submit",
      showMobileOnly: true,
      external: true,
      target: "_self",
    },
    {
      label: "AfterClass OSS",
      icon: <GithubIcon size={16} />,
      href: env.NEXT_PUBLIC_AC_GITHUB_LINK,
      showMobileOnly: true,
      external: true,
    },
  ],
  telegram: [
    {
      label: "Channel",
      icon: <TelegramIcon size={16} />,
      href: env.NEXT_PUBLIC_AC_CHANNEL_LINK,
      external: true,
    },
    {
      label: "Helpdesk",
      icon: <HelpDeskIcon size={16} />,
      href: env.NEXT_PUBLIC_AC_HELPDESK_LINK,
      external: true,
    },
  ],
  site: [
    {
      label: "Statistics",
      icon: <StatisticsTableIcon size={16} />,
      href: "/statistics",
      external: true,
    },
  ],
};

const { main: SIDEBAR_MAIN_ITEMS, ...SIDEBAR_OTHER_ITEMS } =
  SIDEBAR_CATEGORY_ITEMS;

const sidebarItemName = (label: string) =>
  label.replace(/\s/g, "-").toLowerCase();

export const AppSidebar = () => {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pt-2" asChild>
              <Link href="/" className="text-primary flex items-center px-3">
                <Logo />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SearchCmdk />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {SIDEBAR_MAIN_ITEMS.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <ProgressLink
                      variant="ghost"
                      href={item.href}
                      className="text-muted-foreground hover:bg-border-elevated hover:text-accent-foreground flex items-center justify-start gap-x-3 border border-transparent px-3 py-2 text-sm font-semibold after:!content-none"
                      data-test={`sidebar-${sidebarItemName(item.label)}`}
                    >
                      {item.icon}
                      {item.label}
                    </ProgressLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {Object.entries(SIDEBAR_OTHER_ITEMS).map(([key, items]) =>
          !isMobile && items.every((item) => item.showMobileOnly) ? null : (
            <SidebarGroup key={key}>
              <SidebarGroupLabel>{toTitleCase(key)}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) =>
                    item.devOnly &&
                    process.env.NODE_ENV !== "development" ? null : (
                      <SidebarMenuItem key={item.label}>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.href}
                        >
                          <ProgressLink
                            variant="ghost"
                            href={item.href}
                            target={
                              item.external
                                ? (item.target ?? "_blank")
                                : undefined
                            }
                            className="text-muted-foreground hover:bg-border-elevated hover:text-accent-foreground flex items-center justify-start gap-x-3 border border-transparent px-3 py-2 text-sm font-semibold after:!content-none"
                            data-umami-event={`sidebar-${sidebarItemName(item.label)}`}
                            data-test={`sidebar-${sidebarItemName(item.label)}`}
                          >
                            {item.icon}
                            {item.label}
                          </ProgressLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ),
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ),
        )}
      </SidebarContent>

      <SidebarFooter />
    </Sidebar>
  );
};

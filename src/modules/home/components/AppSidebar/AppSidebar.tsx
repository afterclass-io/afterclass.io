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
} from "@/common/components/Sidebar";
import { Logo } from "@/common/components/Logo";
import {
  ChartLineIcon,
  DealsIcon,
  GithubIcon,
  HelpDeskIcon,
  PlusIcon,
  StarLineAltIcon,
  StatisticsTableIcon,
  TelegramIcon,
} from "@/common/components/CustomIcon";
import { env } from "@/env";
import { Button } from "@/common/components/Button";
import { toTitleCase } from "@/common/functions";
import Link from "next/link";
import { SearchCmdk } from "@/modules/search/components/SearchCmdk";
import { usePathname } from "next/navigation";
import { useIsMobile } from "@/common/hooks";
import { ProgressLink } from "@/common/components/Progress";

type SidebarItemType = {
  label: string;
  icon: React.ReactNode;
  href: string;
  exact?: boolean;
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
      exact: true,
    },
    {
      label: "Bid Analytics",
      icon: <ChartLineIcon />,
      href: "/bidding",
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
    },
  ],
  telegram: [
    {
      label: "Channel",
      icon: <TelegramIcon size={16} />,
      href: env.NEXT_PUBLIC_AC_CHANNEL_LINK,
    },
    {
      label: "Helpdesk",
      icon: <HelpDeskIcon size={16} />,
      href: env.NEXT_PUBLIC_AC_HELPDESK_LINK,
    },
  ],
  site: [
    {
      label: "Statistics",
      icon: <StatisticsTableIcon size={16} />,
      href: "/statistics",
      external: true,
    },
    {
      label: "Themes",
      icon: <DealsIcon size={16} />,
      href: "/themes",
      devOnly: true,
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
            <SidebarMenuButton size="lg" asChild>
              <Link
                href="/"
                className="flex items-center px-3 text-primary-default"
              >
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
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.exact
                        ? pathname === item.href
                        : pathname?.startsWith(item.href) // pathname is null in storybook context
                    }
                  >
                    <ProgressLink
                      variant="ghost"
                      href={item.href}
                      iconLeft={item.icon}
                      fullWidth
                      className="flex items-center justify-start gap-x-3 border border-transparent px-3 py-2 text-sm font-semibold text-text-em-mid after:!content-none hover:bg-border-elevated hover:text-text-em-high"
                      data-test={`sidebar-${sidebarItemName(item.label)}`}
                    >
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
                          isActive={
                            item.exact
                              ? pathname === item.href
                              : pathname?.startsWith(item.href) // pathname is null in storybook context
                          }
                        >
                          <ProgressLink
                            variant="ghost"
                            href={item.href}
                            target={
                              item.external
                                ? (item.target ?? "_blank")
                                : undefined
                            }
                            external={item.external}
                            iconLeft={item.icon}
                            fullWidth
                            className="flex items-center justify-start gap-x-3 border border-transparent px-3 py-2 text-sm font-semibold text-text-em-mid after:!content-none hover:bg-border-elevated hover:text-text-em-high"
                            data-umami-event={`sidebar-${sidebarItemName(item.label)}`}
                            data-test={`sidebar-${sidebarItemName(item.label)}`}
                          >
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

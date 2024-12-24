"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import PhStar from "~icons/ph/star";
import PhChartLine from "~icons/ph/chart-line";
import PhPlus from "~icons/ph/plus";
import PhGithubLogo from "~icons/ph/github-logo";
import PhTelegramLogo from "~icons/ph/telegram-logo";
import PhHeadset from "~icons/ph/headset";
import PhChartBar from "~icons/ph/chart-bar";
import PhPaintBrush from "~icons/ph/paint-brush";

import { env } from "@/env";
import { toTitleCase } from "@/common/functions";
import { useIsMobile } from "@/common/hooks";

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
import { Button } from "@/common/components/Button";
import { Logo } from "@/common/components/Logo";

import { SearchCmdk } from "@/modules/search/components/SearchCmdk";

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
      icon: <PhStar />,
      href: "/",
      exact: true,
    },
    {
      label: "Bid Analytics",
      icon: <PhChartLine />,
      href: "/bidding",
    },
    // Development-only links
    ...(process.env.NODE_ENV === "development" ? [] : []),
  ],
  contribute: [
    {
      label: "Write a Review",
      icon: <PhPlus />,
      href: "/submit",
      showMobileOnly: true,
      external: true,
      target: "_self",
    },
    {
      label: "AfterClass OSS",
      icon: <PhGithubLogo />,
      href: env.NEXT_PUBLIC_AC_GITHUB_LINK,
      showMobileOnly: true,
    },
  ],
  telegram: [
    {
      label: "Channel",
      icon: <PhTelegramLogo />,
      href: env.NEXT_PUBLIC_AC_CHANNEL_LINK,
    },
    {
      label: "Helpdesk",
      icon: <PhHeadset />,
      href: env.NEXT_PUBLIC_AC_HELPDESK_LINK,
    },
  ],
  site: [
    {
      label: "Statistics",
      icon: <PhChartBar />,
      href: "/statistics",
      external: true,
    },
    {
      label: "Themes",
      icon: <PhPaintBrush />,
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
                    <Button
                      as="a"
                      variant="ghost"
                      href={item.href}
                      iconLeft={item.icon}
                      fullWidth
                      className="flex items-center justify-start gap-x-3 border border-transparent px-3 py-2 text-sm font-semibold text-text-em-mid after:!content-none hover:bg-border-elevated hover:text-text-em-high"
                      data-test={`sidebar-${sidebarItemName(item.label)}`}
                    >
                      {item.label}
                    </Button>
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
                          <Button
                            as="a"
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
                          </Button>
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

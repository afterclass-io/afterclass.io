"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useRouter } from "next/navigation";

import { Modal } from "@/common/components/Modal";
import { Button } from "@/common/components/Button";
import { SearchIcon } from "@/common/components/CustomIcon";
import { Input } from "@/common/components/Input";
import { useEdgeConfigs } from "@/common/hooks";

import { searchCmdkTheme } from "./SearchCmdk.theme";
import { SearchCmdkModalTrigger } from "./SearchCmdkModalTrigger";

const hasShownCmdkTooltipAtom = atomWithStorage(
  "hasShownCmdkTooltip",
  false,
  undefined,
  { getOnInit: true },
);

export const SearchCmdk = ({
  asChild,
  children,
}: {
  asChild?: boolean;
  children?: ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [hasShownTooltip, setHasShownTooltip] = useAtom(
    hasShownCmdkTooltipAtom,
  );
  const router = useRouter();
  const edgeConfig = useEdgeConfigs();

  useEffect(() => {
    if (asChild) return;
    const timeoutId = setTimeout(() => {
      setIsTooltipOpen(true);
      setHasShownTooltip(true);
    }, 10_000);

    if (!edgeConfig.enableCmdkTooltip || hasShownTooltip) {
      clearTimeout(timeoutId);
    } else {
      return () => clearTimeout(timeoutId);
    }
  }, [edgeConfig, hasShownTooltip]);

  useEffect(() => {
    if (asChild) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/") {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const getSearchDestination = () => {
    const params = new URLSearchParams();
    params.set("q", searchTerm);
    return `/search?${params.toString()}`;
  };

  const onSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (searchTerm.length > 0) {
      setOpen(false);
      router.push(getSearchDestination());
    }
  };

  const { modal, searchIcon, content, contentForm, contentInput, closeBtn } =
    searchCmdkTheme();

  return (
    <Modal
      variant="command"
      open={open}
      onOpenChange={setOpen}
      className={modal()}
      hasCloseButton={false}
    >
      <Modal.Trigger>
        {asChild ? (
          children
        ) : (
          <SearchCmdkModalTrigger
            open={isTooltipOpen}
            onOpenChange={() => setIsTooltipOpen((prev) => !prev)}
          />
        )}
      </Modal.Trigger>
      <Modal.Content className={content()} data-test="search-cmdk-modal">
        <form onSubmit={onSearchSubmit} className={contentForm()}>
          <Input
            placeholder="Search for Professors or Courses..."
            className={contentInput()}
            type="text"
            contentLeft={<SearchIcon className={searchIcon()} />}
            wrapperProps={{ className: "border-0 h-full w-full" }}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-test="search-cmdk-input"
          />
        </form>
        <Modal.Close asChild>
          <Button
            variant="primary"
            aria-label="close"
            size="sm"
            className={closeBtn()}
            as="a"
            href={getSearchDestination()}
            data-test="search-cmdk-submit"
            type="button"
          >
            Search
          </Button>
        </Modal.Close>
      </Modal.Content>
    </Modal>
  );
};

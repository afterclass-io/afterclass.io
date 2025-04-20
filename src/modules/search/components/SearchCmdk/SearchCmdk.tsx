"use client";

import {
  type FormEvent,
  type ReactNode,
  startTransition,
  useEffect,
  useState,
} from "react";
import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useRouter } from "next/navigation";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

import {
  Modal,
  ModalClose,
  ModalContent,
  ModalTitle,
  ModalTrigger,
} from "@/common/components/modal";
import { SearchIcon } from "@/common/components/icons";
import { Input, InputIcon, InputRoot } from "@/common/components/input";
import { useEdgeConfigs } from "@/common/hooks";

import { SearchCmdkModalTrigger } from "./SearchCmdkModalTrigger";
import { useProgress } from "@/common/providers/ProgressProvider";
import { ProgressLink } from "@/common/components/progress-link";

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
  const progress = useProgress();
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
    setOpen(false);

    if (searchTerm.length === 0) return;

    progress.start();
    startTransition(() => {
      router.push(getSearchDestination());
      progress.done();
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      hasCloseButton={false}
      className="w-[45rem]"
    >
      <ModalTrigger asChild>
        {asChild ? (
          children
        ) : (
          <SearchCmdkModalTrigger
            open={isTooltipOpen}
            onOpenChange={() => setIsTooltipOpen((prev) => !prev)}
          />
        )}
      </ModalTrigger>
      <ModalContent
        data-test="search-cmdk-modal"
        className="mt-[10%] flex-row items-center gap-2 overflow-hidden border-none px-4 py-0 sm:py-0"
      >
        <VisuallyHidden asChild>
          <ModalTitle>Search for Professors or Courses</ModalTitle>
        </VisuallyHidden>
        <form
          onSubmit={onSearchSubmit}
          className="flex h-full w-full items-center justify-between gap-4 p-2 pr-5"
        >
          <SearchIcon />
          <Input
            className="flex h-11 w-full shrink items-center gap-2 border-none bg-transparent p-2 focus:outline-none focus-visible:ring-0"
            placeholder="Search for Professors or Courses..."
            type="text"
            onChange={(e) => setSearchTerm(e.target.value)}
            data-test="search-cmdk-input"
          />
        </form>
        <ModalClose asChild>
          <ProgressLink
            href={getSearchDestination()}
            className="bg-primary hover:bg-primary/80 flex h-full items-center justify-center font-semibold transition-colors duration-200"
            aria-label="close"
            data-test="search-cmdk-submit"
            type="button"
          >
            Search
          </ProgressLink>
        </ModalClose>
      </ModalContent>
    </Modal>
  );
};

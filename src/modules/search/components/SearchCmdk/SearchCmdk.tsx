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
import { useEdgeConfigs } from "@/common/hooks";
import { SearchCmdkModalTrigger } from "./SearchCmdkModalTrigger";
import { useProgress } from "@/common/providers/ProgressProvider";
import { ProgressLink } from "@/common/components/progress-link";
import {
  Input,
  InputAdornment,
  InputAdornmentButton,
  InputControl,
  InputRoot,
} from "@/common/components/input";

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
        <form onSubmit={onSearchSubmit} className="h-full w-full">
          <InputRoot className="h-16 w-full items-center gap-4 border-none bg-transparent shadow-none focus-within:ring-0">
            <InputAdornment className="[&_svg]:size-5">
              <SearchIcon />
            </InputAdornment>
            <InputControl>
              <Input
                placeholder="Search for Professors or Courses..."
                type="text"
                className="text-accent-foreground"
                onChange={(e) => setSearchTerm(e.target.value)}
                data-test="search-cmdk-input"
              />
            </InputControl>
            <InputAdornmentButton variant="default" asChild>
              <ModalClose asChild>
                <ProgressLink
                  href={getSearchDestination()}
                  className="flex size-fit items-center justify-center font-semibold"
                  aria-label="close"
                  data-test="search-cmdk-submit"
                >
                  Search
                </ProgressLink>
              </ModalClose>
            </InputAdornmentButton>
          </InputRoot>
        </form>
      </ModalContent>
    </Modal>
  );
};

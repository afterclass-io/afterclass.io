"use client";

import { useCallback, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Star } from "lucide-react";
import { api, type RouterInputs } from "@/common/tools/trpc/react";
import { createOptimisticMutationCallbacks } from "@/common/hooks/create-optimistic-mutation-callbacks";
import {
  selectedTermIdAtom,
  activeTimetableIdAtom,
} from "@/modules/timetable/atoms/timetable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/select";
import { Button } from "@/common/components/button";
import { Input } from "@/common/components/input";
import { Skeleton } from "@/common/components/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/common/components/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/tooltip";
import { cn } from "@/common/functions";

export type VariantSwitcherProps = {
  className?: string;
};

/**
 * Dropdown of the user's timetables for the selected term.
 *
 * Supports:
 * - Switching the viewed variant (`activeTimetableIdAtom`)
 * - Creating a new variant (with optimistic UI)
 * - Marking a variant as the active plan for the term (star button)
 * - Renaming & deleting the current variant
 */
export function VariantSwitcher({ className }: VariantSwitcherProps) {
  const selectedTermId = useAtomValue(selectedTermIdAtom);
  const [activeTimetableId, setActiveTimetableId] =
    useAtom(activeTimetableIdAtom);

  const utils = api.useUtils();

  const { data: session } = useSession();

  const { data: timetables, isLoading } = api.timetable.listMine.useQuery(
    { acadTermId: selectedTermId ?? "" },
    { enabled: !!selectedTermId && !!session },
  );

  // ---- Create ----
  const createMutation = api.timetable.create.useMutation({
    onSuccess: (created) => {
      void utils.timetable.listMine.invalidate({ acadTermId: selectedTermId! });
      setActiveTimetableId(created.id);
      toast.success(`Created "${created.name}"`);
    },
    onError: () => toast.error("Failed to create timetable"),
  });

  const handleCreate = useCallback(() => {
    if (!selectedTermId) return;
    createMutation.mutate({ acadTermId: selectedTermId });
  }, [selectedTermId, createMutation]);

  // ---- Rename ----
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const renameMutation = api.timetable.rename.useMutation({
    onSuccess: () => {
      void utils.timetable.listMine.invalidate({ acadTermId: selectedTermId! });
      toast.success("Renamed");
      setRenameOpen(false);
    },
    onError: () => toast.error("Failed to rename"),
  });

  const handleRename = useCallback(
    (timetableId: string) => {
      if (!renameValue.trim()) return;
      renameMutation.mutate({ timetableId, name: renameValue.trim() });
    },
    [renameValue, renameMutation],
  );

  // ---- Delete ----
  const deleteMutation = api.timetable.remove.useMutation({
    onSuccess: () => {
      void utils.timetable.listMine.invalidate({ acadTermId: selectedTermId! });
      toast.success("Deleted");
      // If deleting the active variant, clear selection
      if (activeTimetableId) {
        const remaining = (timetables ?? []).filter(
          (t) => t.id !== activeTimetableId,
        );
        setActiveTimetableId(remaining[0]?.id ?? null);
      }
    },
    onError: () => toast.error("Failed to delete"),
  });

  // ---- Set active (star) — one active plan per term, enforced server-side ----
  const setActiveMutation = api.timetable.setActive.useMutation({
    ...createOptimisticMutationCallbacks<
      RouterInputs["timetable"]["setActive"],
      unknown
    >({
      cancel: async () => {
        if (!selectedTermId) return;
        await utils.timetable.listMine.cancel({ acadTermId: selectedTermId });
      },
      getSnapshot: () => {
        if (!selectedTermId) return undefined;
        return utils.timetable.listMine.getData({ acadTermId: selectedTermId });
      },
      // Pattern B: the caller does NOT apply optimistically.
      applyOptimistic: ({ timetableId }) => {
        if (!selectedTermId) return;
        utils.timetable.listMine.setData(
          { acadTermId: selectedTermId },
          (old) =>
            old?.map((t) => ({ ...t, isActive: t.id === timetableId })),
        );
      },
      restoreSnapshot: (prev) => {
        if (!selectedTermId) return;
        utils.timetable.listMine.setData(
          { acadTermId: selectedTermId },
          prev as never,
        );
      },
      invalidate: async () => {
        if (!selectedTermId) return;
        await utils.timetable.listMine.invalidate({ acadTermId: selectedTermId });
      },
      onError: () => toast.error("Failed to set active timetable"),
    }),
    onSuccess: () => {
      void utils.timetable.listMine.invalidate({ acadTermId: selectedTermId! });
    },
  });

  // ---- Switch viewed variant (does NOT change the active plan) ----
  const handleSwitch = useCallback(
    (id: string) => {
      setActiveTimetableId(id);
    },
    [setActiveTimetableId],
  );

  // ---- No term selected ----
  if (!selectedTermId) {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>
        Select a term first
      </span>
    );
  }

  if (isLoading || !timetables) {
    return <Skeleton className={cn("h-9 w-44", className)} />;
  }

  const active = timetables.find((t) => t.id === activeTimetableId);
  const isCreating = createMutation.isPending;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Variant selector — switches which plan is viewed, not which is active */}
      <Select
        value={activeTimetableId ?? undefined}
        onValueChange={handleSwitch}
      >
        <SelectTrigger className="w-44" size="sm" data-test="timetable-variant-switcher">
          <SelectValue placeholder="No timetable" />
        </SelectTrigger>
        <SelectContent>
          {timetables.map((t) => (
            <SelectItem key={t.id} value={t.id} data-test={`timetable-variant-${t.id}`}>
              {t.name}
              <span className="ml-2 text-xs text-muted-foreground">
                ({t._count.slots})
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Active plan toggle (one active timetable per term) — mirrors the
          roadmap star pattern */}
      {active && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                active.isActive
                  ? "Active plan"
                  : "Mark as active plan"
              }
              disabled={active.isActive || setActiveMutation.isPending}
              onClick={() =>
                setActiveMutation.mutate({ timetableId: active.id })
              }
              data-test="timetable-variant-active-toggle"
            >
              <Star
                className={cn(
                  "size-4",
                  active.isActive
                    ? "fill-primary text-primary"
                    : "text-muted-foreground",
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {active.isActive
              ? "Active plan — the default timetable for this term"
              : "Mark as the active plan for this term"}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Create new variant */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCreate}
            disabled={isCreating}
            aria-label="Create new timetable"
            data-test="timetable-variant-create"
          >
            <Plus className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Create a new timetable variant</TooltipContent>
      </Tooltip>

      {/* Rename / Delete dropdown for active variant */}
      {active && (
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Rename or delete timetable"
                >
                  <Pencil className="size-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Rename or delete this timetable</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setRenameValue(active.name);
                setRenameOpen(true);
              }}
            >
              <Pencil className="size-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => deleteMutation.mutate({ timetableId: active.id })}
              disabled={timetables.length <= 1}
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Rename dialog — rendered outside the dropdown so it survives the
          menu closing on item select */}
      {active && (
        <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename timetable</DialogTitle>
              <DialogDescription>
                Enter a new name for &quot;{active.name}&quot;.
              </DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename(active.id);
              }}
              placeholder="Timetable name"
              aria-label="Timetable name"
            />
            <DialogFooter>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRenameOpen(false)}
                disabled={renameMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handleRename(active.id)}
                disabled={renameMutation.isPending || !renameValue.trim()}
                data-test="timetable-variant-rename-save"
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

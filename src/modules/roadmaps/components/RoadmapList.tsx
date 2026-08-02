"use client";

import { useCallback, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Check,
  X,
  Globe,
  Share2,
  Star,
} from "lucide-react";
import { Button } from "@/common/components/button";
import { Input } from "@/common/components/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/common/components/alert-dialog";
import { cn } from "@/common/functions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RoadmapListItem = {
  id: string;
  name: string;
  entryCount: number;
  visibility?: string;
  shareToken?: string | null;
  /** True for the user's active roadmap (syncs with timetables). */
  isActive?: boolean;
};

export type RoadmapListProps = {
  roadmaps: RoadmapListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  /** True while a create/rename mutation is in flight. */
  isMutating?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RoadmapList({
  roadmaps,
  selectedId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  isMutating = false,
  className,
  style,
}: RoadmapListProps) {
  // ---- Local state ----
  const [isCreating, setIsCreating] = useState(false);
  const [createName, setCreateName] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<RoadmapListItem | null>(
    null,
  );

  // ---- Handlers ----
  const handleCreate = useCallback(() => {
    const trimmed = createName.trim();
    if (!trimmed || isMutating) return;
    onCreate(trimmed);
    setCreateName("");
    setIsCreating(false);
  }, [createName, isMutating, onCreate]);

  const handleStartRename = useCallback((item: RoadmapListItem) => {
    setEditingId(item.id);
    setEditName(item.name);
  }, []);

  const handleCommitRename = useCallback(() => {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (!trimmed || isMutating) {
      setEditingId(null);
      return;
    }
    onRename(editingId, trimmed);
    setEditingId(null);
  }, [editingId, editName, isMutating, onRename]);

  const handleCancelRename = useCallback(() => {
    setEditingId(null);
  }, []);

  // ---- Render ----
  return (
    <aside
      // No h-full: the editor's flex row stretches this column to the full
      // height (h-full would resolve against an auto-height parent and leave
      // the list short while the separator runs the full editor height).
      className={cn("bg-background flex flex-col border-r", className)}
      style={style}
      data-test="roadmap-list"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="text-sm font-semibold">My Roadmaps</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => {
                setIsCreating(true);
                setCreateName("");
              }}
              disabled={isMutating || isCreating}
              aria-label="Create new roadmap"
            >
              <Plus className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Create a new roadmap</TooltipContent>
        </Tooltip>
      </div>

      {/* Create input */}
      {isCreating && (
        <div className="flex items-center gap-1 border-b px-3 py-2">
          <Input
            autoFocus
            placeholder="Roadmap name…"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setIsCreating(false);
                setCreateName("");
              }
            }}
            className="h-8 text-sm"
            disabled={isMutating}
            data-test="roadmap-create-input"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={handleCreate}
                  disabled={isMutating || !createName.trim()}
                  aria-label="Confirm create"
                >
                  {isMutating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Create roadmap</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                onClick={() => {
                  setIsCreating(false);
                  setCreateName("");
                }}
                disabled={isMutating}
                aria-label="Cancel create"
              >
                <X className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cancel</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1">
        {roadmaps.length === 0 && !isCreating && (
          <p className="text-muted-foreground px-3 py-6 text-center text-xs">
            No roadmaps yet.
            <br />
            Click + to create one.
          </p>
        )}

        {roadmaps.map((item) => {
          const isPublic = item.visibility === "PUBLIC";
          const isUnlisted = item.visibility === "UNLISTED";

          return (
            <div
              key={item.id}
              className={cn(
                "group flex items-center gap-2 px-3 py-2 transition-colors",
                selectedId === item.id
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted/50",
              )}
            >
              {/* Active roadmap indicator */}
              {item.isActive && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-flex shrink-0"
                      aria-label="Active roadmap"
                    >
                      <Star className="fill-primary text-primary size-3 shrink-0" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Active roadmap — syncs with your timetables
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Visibility indicator */}
              {isPublic && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-flex shrink-0"
                      aria-label="Public roadmap"
                    >
                      <Globe className="text-success size-3 shrink-0" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Public — visible in the community gallery
                  </TooltipContent>
                </Tooltip>
              )}
              {isUnlisted && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-flex shrink-0"
                      aria-label="Unlisted roadmap"
                    >
                      <Share2 className="text-warning size-3 shrink-0" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Unlisted — anyone with the link can view
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Name (editable) */}
              {editingId === item.id ? (
                <Input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCommitRename();
                    if (e.key === "Escape") handleCancelRename();
                  }}
                  onBlur={handleCommitRename}
                  className="h-7 flex-1 text-sm"
                  disabled={isMutating}
                  data-test="roadmap-rename-input"
                />
              ) : (
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-sm font-medium"
                  onClick={() => onSelect(item.id)}
                  data-test="roadmap-list-item"
                >
                  {item.name}
                </button>
              )}

              {/* Entry count badge */}
              <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                {item.entryCount}
              </span>

              {/* Actions (visible on hover) */}
              <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => handleStartRename(item)}
                      disabled={isMutating}
                      aria-label={`Rename ${item.name}`}
                    >
                      <Pencil className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Rename</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive size-6"
                      onClick={() => setDeleteTarget(item)}
                      disabled={isMutating}
                      aria-label={`Delete ${item.name}`}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete roadmap?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.name}&quot; and
              all its entries. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating}
              onClick={() => {
                if (deleteTarget) {
                  onDelete(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
              data-test="roadmap-delete-confirm"
            >
              {isMutating && (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}

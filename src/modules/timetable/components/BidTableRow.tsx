"use client";

import { CalendarPlus, ChevronDown, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/common/functions";
import { Button } from "@/common/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/common/components/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/common/components/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/tooltip";
import { Td } from "@/common/components/table-primitives";
import { formatBidAmount } from "@/modules/timetable/functions/format";
import {
  BID_STATUS_LABELS,
  BID_STATUS_OPTIONS,
  bidChipVariant,
  type UserBidStatus,
} from "@/modules/timetable/functions/bid-status";
import type { UserBidRow } from "./BidDialog";
import { ClassInfoButton } from "./ClassInfoButton";
import { InlineNotesEditor } from "./InlineNotesEditor";

export function BidTableRow({
  bid,
  isBusy,
  pendingAddClassId,
  hasActiveTimetable,
  onSaveNotes,
  onShowClassInfo,
  onEdit,
  onAddToTimetable,
  onSetStatus,
  onDelete,
}: {
  bid: UserBidRow;
  isBusy: boolean;
  pendingAddClassId: string | null;
  hasActiveTimetable: boolean;
  onSaveNotes: (notes: string | null) => Promise<void>;
  onShowClassInfo: () => void;
  onEdit: () => void;
  onAddToTimetable: () => void;
  onSetStatus: (status: UserBidStatus) => void;
  onDelete: () => void;
}) {
  const rowAdding = pendingAddClassId === bid.classId;
  return (
    <tr className="border-b last:border-0">
      <Td className="whitespace-nowrap">
        R{bid.bidWindow.round} W{bid.bidWindow.window}
      </Td>
      <Td className="font-medium whitespace-nowrap">
        <ClassInfoButton onClick={onShowClassInfo}>
          {bid.courseCode}
        </ClassInfoButton>
      </Td>
      <Td className="max-w-44">
        <ClassInfoButton onClick={onShowClassInfo} title={bid.courseName}>
          {bid.courseName}
        </ClassInfoButton>
      </Td>
      <Td>
        <ClassInfoButton onClick={onShowClassInfo}>
          {bid.section}
        </ClassInfoButton>
      </Td>
      <Td className="max-w-36 truncate" title={bid.professorName ?? undefined}>
        {bid.professorName ? (
          <ClassInfoButton onClick={onShowClassInfo} title={bid.professorName}>
            {bid.professorName}
          </ClassInfoButton>
        ) : (
          "TBA"
        )}
      </Td>
      <Td className="text-right font-mono tabular-nums">
        {formatBidAmount(bid.bidAmount)}
      </Td>
      <Td className="min-w-40">
        <InlineNotesEditor
          key={`${bid.id}:${bid.notes ?? ""}`}
          bidId={bid.id}
          initialNotes={bid.notes}
          disabled={isBusy}
          onSave={onSaveNotes}
        />
      </Td>
      <Td>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={onAddToTimetable}
                disabled={!hasActiveTimetable || isBusy || rowAdding}
                aria-label={`Add ${bid.courseCode} ${bid.section} to timetable`}
              >
                {rowAdding ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CalendarPlus className="size-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {hasActiveTimetable
                ? "Add to timetable"
                : "No active timetable for this term"}
            </TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onEdit}
            disabled={isBusy}
          >
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-7 px-2 text-xs", bidChipVariant(bid.status))}
                disabled={isBusy}
                aria-label={`Change status for ${bid.courseCode} ${bid.section} bid`}
              >
                {BID_STATUS_LABELS[bid.status] ?? bid.status}
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {BID_STATUS_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  disabled={bid.status === opt.value}
                  onClick={() => onSetStatus(opt.value)}
                  className={bidChipVariant(opt.value)}
                >
                  <span className="size-2 shrink-0 rounded-full bg-current opacity-60" />
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-7 px-2 text-xs"
                    disabled={isBusy}
                    aria-label={`Delete bid for ${bid.courseCode} ${bid.section}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Delete bid</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this bid?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes your {formatBidAmount(bid.bidAmount)} bid for{" "}
                  {bid.courseCode} {bid.section} (R{bid.bidWindow.round} W
                  {bid.bidWindow.window}). This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Td>
    </tr>
  );
}

"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import { api } from "@/common/tools/trpc/react";
import { Button } from "@/common/components/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  classId: string;
  acadTermId: string;
  courseName?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * A button that adds a class to the user's active timetable for the given term.
 *
 * Behavior:
 * 1. Fetches the user's timetables for this term via `timetable.listMine`
 * 2. Finds the active one; if none exist, creates one (auto-named "Plan A")
 * 3. Calls `timetable.addSlot` to add the class
 * 4. Shows a success toast with a link to /timetable
 * 5. If the class is already in the timetable, shows an info toast
 */
export function AddToTimetableButton({
  classId,
  acadTermId,
  courseName: _courseName,
}: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const utils = api.useUtils();

  const createMutation = api.timetable.create.useMutation();
  const addSlotMutation = api.timetable.addSlot.useMutation();

  const handleAdd = useCallback(async () => {
    setIsAdding(true);
    try {
      // 1. Fetch user's timetables for this term
      const timetables = await utils.timetable.listMine.fetch({ acadTermId });

      // 2. Find active timetable; create one if none exist
      let timetableId: string;
      let timetableName: string;

      if (timetables.length === 0) {
        const created = await createMutation.mutateAsync({ acadTermId });
        timetableId = created.id;
        timetableName = created.name;
        void utils.timetable.listMine.invalidate({ acadTermId });
      } else {
        const active =
          timetables.find((t) => t.isActive) ?? timetables[0]!;
        timetableId = active.id;
        timetableName = active.name;
      }

      // 3. Add slot to timetable
      try {
        await addSlotMutation.mutateAsync({ timetableId, classId });
        toast.success(
          <span>
            Added to{" "}
            <Link
              href="/timetable"
              className="underline font-medium hover:opacity-80"
            >
              {timetableName}
            </Link>
            .
          </span>,
        );
        void utils.timetable.getArrangement.invalidate({ timetableId });
      } catch (err: unknown) {
        // Unique constraint violation → class already in timetable
        const msg =
          typeof err === "object" && err !== null
            ? (err as { message?: string }).message ?? ""
            : "";
        if (
          msg.includes("Unique constraint") ||
          msg.includes("P2002") ||
          msg.includes("already exists") ||
          msg.includes("duplicate")
        ) {
          toast.info(
            <span>
              Already in{" "}
              <Link
                href="/timetable"
                className="underline font-medium hover:opacity-80"
              >
                {timetableName}
              </Link>
              .
            </span>,
          );
        } else {
          throw err;
        }
      }
    } catch {
      toast.error("Failed to add to timetable. Please try again.");
    } finally {
      setIsAdding(false);
    }
  }, [classId, acadTermId, utils, createMutation, addSlotMutation]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleAdd}
      disabled={isAdding}
      aria-label="Add to timetable"
    >
      {isAdding ? (
        <Loader2 className="mr-1.5 size-4 animate-spin" />
      ) : (
        <Plus className="mr-1.5 size-4" />
      )}
      Add to timetable
    </Button>
  );
}

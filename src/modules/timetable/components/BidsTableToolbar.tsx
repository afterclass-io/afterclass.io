"use client";

import { Plus } from "lucide-react";
import { Button } from "@/common/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/select";

/** Term / round / window filters plus the "Add bid" button above the bids table. */
export function BidsTableToolbar({
  terms,
  termId,
  onTermChange,
  roundFilter,
  onRoundChange,
  roundOptions,
  windowFilter,
  onWindowChange,
  windowOptions,
  onAddBid,
  addDisabled,
}: {
  terms: { id: string; label: string }[];
  termId: string | null;
  onTermChange: (termId: string) => void;
  roundFilter: string;
  onRoundChange: (round: string) => void;
  roundOptions: string[];
  windowFilter: string;
  onWindowChange: (window: string) => void;
  windowOptions: number[];
  onAddBid: () => void;
  addDisabled: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={termId ?? undefined} onValueChange={onTermChange}>
        <SelectTrigger size="sm" className="w-44" aria-label="Filter by term">
          <SelectValue placeholder="Term" />
        </SelectTrigger>
        <SelectContent>
          {terms.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={roundFilter} onValueChange={onRoundChange}>
        <SelectTrigger size="sm" className="w-32" aria-label="Filter by round">
          <SelectValue placeholder="Round" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All rounds</SelectItem>
          {roundOptions.map((r) => (
            <SelectItem key={r} value={r}>
              Round {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={windowFilter} onValueChange={onWindowChange}>
        <SelectTrigger size="sm" className="w-32" aria-label="Filter by window">
          <SelectValue placeholder="Window" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All windows</SelectItem>
          {windowOptions.map((w) => (
            <SelectItem key={w} value={String(w)}>
              Window {w}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        size="sm"
        className="ml-auto"
        onClick={onAddBid}
        disabled={addDisabled}
      >
        <Plus className="size-3.5" />
        Add bid
      </Button>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Copy, Globe, Link2, Loader2, Lock, Share2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/common/tools/trpc/react";
import { Button } from "@/common/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/common/components/dialog";
import { Input } from "@/common/components/input";
import { Label } from "@/common/components/label";
import { RadioGroup, RadioGroupItem } from "@/common/components/radio-group";
import { cn } from "@/common/functions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ShareEntity = "timetable" | "roadmap";
export type ShareVisibility = "PRIVATE" | "UNLISTED" | "PUBLIC";

export type ShareDialogProps = {
  entity: ShareEntity;
  entityId: string;
  /** Optional name shown in the dialog title, e.g. the timetable name. */
  entityName?: string;
  visibility: ShareVisibility;
  shareToken: string | null;
  /** Called after visibility is saved so parents can refresh their data. */
  onChanged?: (result: {
    visibility: ShareVisibility;
    shareToken: string | null;
  }) => void;
};

type VisibilityOption = {
  value: ShareVisibility;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

const ALL_VISIBILITY_OPTIONS: VisibilityOption[] = [
  {
    value: "PRIVATE",
    label: "Private",
    description: "Only you can see this.",
    icon: Lock,
  },
  {
    value: "UNLISTED",
    label: "Anyone with the link",
    description: "Anyone who has the link can view it.",
    icon: Link2,
  },
  {
    value: "PUBLIC",
    label: "Public",
    description: "Visible to everyone.",
    icon: Globe,
  },
];

// Timetables have no public gallery — keep the component reusable but hide
// the PUBLIC option when entity === "timetable" (server also rejects it).
const VISIBILITY_OPTIONS_BY_ENTITY: Record<
  ShareEntity,
  VisibilityOption[]
> = {
  timetable: ALL_VISIBILITY_OPTIONS.filter((o) => o.value !== "PUBLIC"),
  roadmap: ALL_VISIBILITY_OPTIONS,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShareDialog({
  entity,
  entityId,
  entityName,
  visibility,
  shareToken,
  onChanged,
}: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ShareVisibility>(visibility);
  const [token, setToken] = useState<string | null>(shareToken);
  const [origin, setOrigin] = useState("");

  const utils = api.useUtils();

  // Reset the draft to the saved state each time the dialog opens, and keep
  // in sync if the parent refetches while closed.
  useEffect(() => {
    if (open) {
      setDraft(visibility);
      setToken(shareToken);
    }
  }, [open, visibility, shareToken]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Engagement: count roadmap share-link copies (fire-and-forget).
  const recordShareMutation = api.roadmaps.recordShare.useMutation();

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
      if (entity === "roadmap") {
        recordShareMutation.mutate({ roadmapId: entityId });
      }
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const saveMutation = api.sharing.setVisibility.useMutation({
    onSuccess: (data) => {
      setToken(data.shareToken);
      toast.success("Sharing settings updated");
      if (entity === "timetable") {
        void utils.timetable.invalidate();
      } else {
        void utils.roadmaps.invalidate();
      }
      onChanged?.(data);
      if (data.visibility !== "PRIVATE" && data.shareToken) {
        // Keep the dialog open so the fresh link is visible, and copy it.
        // data.shareToken comes straight from the mutation response, so this
        // never copies a stale token.
        const url =
          entity === "roadmap" && data.visibility === "PUBLIC"
            ? `${origin}/roadmaps/${entityId}`
            : `${origin}/share/${entity}/${data.shareToken}`;
        void copyLink(url);
      } else {
        // PRIVATE — no link to show, close as before.
        setOpen(false);
      }
    },
    onError: (error) => {
      toast.error(`Failed to update sharing: ${error.message}`);
    },
  });

  // PUBLIC roadmaps are shared via their canonical public page; unlisted
  // roadmaps (and all timetables, which have no public-by-id page) use the
  // token link. The link reflects the SAVED visibility so a not-yet-public
  // roadmap never shows a live-looking URL.
  const shareUrl = useMemo(() => {
    if (entity === "roadmap" && visibility === "PUBLIC") {
      return `${origin}/roadmaps/${entityId}`;
    }
    return token ? `${origin}/share/${entity}/${token}` : null;
  }, [entity, entityId, origin, token, visibility]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    await copyLink(shareUrl);
  };

  const title = entityName ? `Share ${entityName}` : `Share ${entity}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-test="share-button">
          <Share2 className="size-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Choose who can see this {entity}.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={draft}
          onValueChange={(v) => setDraft(v as ShareVisibility)}
          className="gap-2"
        >
          {VISIBILITY_OPTIONS_BY_ENTITY[entity].map((option) => (
            <Label
              key={option.value}
              htmlFor={`share-visibility-${option.value}`}
              className={cn(
                "hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors",
                draft === option.value ? "border-primary" : "border-border",
              )}
            >
              <RadioGroupItem
                id={`share-visibility-${option.value}`}
                value={option.value}
                className="mt-0.5"
              />
              <div className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <option.icon className="text-muted-foreground size-4" />
                  {option.label}
                </span>
                <span className="text-muted-foreground text-xs">
                  {option.description}
                </span>
              </div>
            </Label>
          ))}
        </RadioGroup>

        {draft !== "PRIVATE" && (
          <div className="flex flex-col gap-2">
            {shareUrl ? (
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
                  className="text-sm"
                  aria-label="Shareable link"
                  data-test="share-link-input"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  data-test="share-copy-link"
                >
                  <Copy className="size-4" />
                  Copy
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                Save to generate a shareable link.
              </p>
            )}
            {draft === "PUBLIC" && (
              <p className="text-muted-foreground text-xs">
                {entity === "roadmap"
                  ? "Public roadmaps appear in the public gallery for other students to discover."
                  : "Public timetables are discoverable by other students."}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={saveMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() =>
              saveMutation.mutate({ entity, id: entityId, visibility: draft })
            }
            disabled={saveMutation.isPending}
            data-test="share-save"
          >
            {saveMutation.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, type ComponentPropsWithoutRef, type FormEvent } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { Heading } from "@/common/components/heading";
import { Button } from "@/common/components/button";
import { cn } from "@/common/functions";

export type PageTitleProps = ComponentPropsWithoutRef<"div"> & {
  children: React.ReactNode;
  contentLeft?: React.ReactNode;
  contentRight?: React.ReactNode;
  wrapperProps?: ComponentPropsWithoutRef<"div">;
  /** When true and onSave is provided, enables inline title editing */
  editable?: boolean;
  value?: string;
  onSave?: (nextTitle: string) => void | Promise<void>;
  isSaving?: boolean;
  maxLength?: number;
};

export const PageTitle = ({
  children,
  contentLeft,
  contentRight,
  wrapperProps,
  className,
  editable,
  value,
  onSave,
  isSaving = false,
  maxLength = 120,
  ...props
}: PageTitleProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const initialText = value ?? (typeof children === "string" ? children : "");
  const [draft, setDraft] = useState(initialText);

  const startEditing = () => {
    setDraft(value ?? (typeof children === "string" ? children : ""));
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDraft(initialText);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isSaving) return;
    if (trimmed !== initialText && onSave) {
      try {
        await onSave(trimmed);
      } catch {
        return;
      }
    }
    setIsEditing(false);
  };

  return (
    <div
      {...wrapperProps}
      className={cn(
        "inline-flex items-center gap-3 pb-2 md:gap-6",
        wrapperProps?.className,
      )}
    >
      {contentLeft}
      {editable && onSave ? (
        isEditing ? (
          <form
            onSubmit={handleSubmit}
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            <input
              type="text"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  handleCancel();
                }
              }}
              maxLength={maxLength}
              className={cn(
                "border-input bg-background focus-visible:ring-ring min-w-0 flex-1 rounded-md border px-3 py-1 text-lg font-bold shadow-xs focus-visible:ring-2 focus-visible:outline-hidden md:text-2xl",
                className,
              )}
              data-test="page-title-input"
              aria-label="Edit title"
              disabled={isSaving}
            />
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                className="size-8"
                disabled={(isSaving ?? false) || !draft.trim()}
                data-test="page-title-save"
                aria-label="Save title"
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={handleCancel}
                disabled={isSaving}
                data-test="page-title-cancel"
                aria-label="Cancel editing title"
              >
                <X className="size-4" />
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <Heading
              className={cn("text-center text-lg md:text-3xl", className)}
              as="h1"
              {...props}
              data-test="page-title"
            >
              {children}
            </Heading>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground size-7 shrink-0"
              aria-label="Edit title"
              onClick={startEditing}
              data-test="page-title-edit"
            >
              <Pencil className="size-3.5" />
            </Button>
          </div>
        )
      ) : (
        <Heading
          className={cn("text-center text-lg md:text-3xl", className)}
          as="h1"
          {...props}
          data-test="page-title"
        >
          {children}
        </Heading>
      )}
      {contentRight}
    </div>
  );
};

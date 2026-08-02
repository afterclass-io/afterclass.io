import { cn } from "@/common/functions";

export type EmptyStateProps = {
  /** Optional icon rendered above the title (e.g. a Lucide icon). */
  icon?: React.ReactNode;
  /** Short heading. */
  title: string;
  /** One line of microcopy under the title. */
  description?: string;
  /** Primary call-to-action — usually a Button or Link. */
  action?: React.ReactNode;
  className?: string;
};

/**
 * Shared empty state: a dashed-border card with an optional icon, a title,
 * one line of microcopy and an optional primary CTA. First-time-user states
 * should always offer a next step (via `action`) instead of a dead end.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "border-border bg-muted/30 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center",
        className,
      )}
    >
      {icon && (
        <div
          data-slot="empty-state-icon"
          className="text-muted-foreground [&_svg]:size-8"
        >
          {icon}
        </div>
      )}
      <p data-slot="empty-state-title" className="text-lg font-semibold">
        {title}
      </p>
      {description && (
        <p
          data-slot="empty-state-description"
          className="text-muted-foreground text-sm"
        >
          {description}
        </p>
      )}
      {action && (
        <div data-slot="empty-state-action" className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}

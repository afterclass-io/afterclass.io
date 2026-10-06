import { Tag } from "@/common/components/tag";
import { cn } from "@/common/functions";

export type MeetingMetaTagsProps = {
  course?: { code: string } | null;
  section?: string | null;
  teamIdentifier?: string | null;
  className?: string;
};

/**
 * The course/section and team tags shown wherever a meeting is listed. Tags are
 * read-only labels, so the delete affordance is always hidden.
 */
export function MeetingMetaTags({
  course,
  section,
  teamIdentifier,
  className,
}: MeetingMetaTagsProps) {
  if (!course && !teamIdentifier) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {course && (
        <Tag size="xs" color="primary" variant="soft" deletable={false}>
          {course.code}
          {section ? ` · ${section}` : ""}
        </Tag>
      )}
      {teamIdentifier && (
        <Tag size="xs" variant="outline" deletable={false}>
          {teamIdentifier}
        </Tag>
      )}
    </div>
  );
}

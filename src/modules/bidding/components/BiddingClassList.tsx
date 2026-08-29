"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ClassCard } from "@/modules/bidding/components/ClassCard";
import type {
  Courses,
  ClassTiming,
  ClassExamTiming,
  Professors,
} from "@/generated/prisma/client";

interface ClassItem {
  id: string;
  section: string;
  course: Partial<Courses>;
  classTimings: Pick<
    ClassTiming,
    "dayOfWeek" | "startTime" | "endTime" | "venue"
  >[];
  classExamTimings: Partial<ClassExamTiming>[];
  professor: Partial<Professors> | null;
}

const PAGE_SIZE = 30;

export const BiddingClassList = ({
  initialClasses,
}: {
  initialClasses: ClassItem[];
}) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = visibleCount < initialClasses.length;

  const visibleClasses = initialClasses.slice(0, visibleCount);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) =>
      Math.min(prev + PAGE_SIZE, initialClasses.length),
    );
  }, [initialClasses.length]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!hasMore) return undefined;
    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (initialClasses.length === 0) {
    return (
      <div className="col-span-2 text-center text-gray-500">
        No classes found for the selected filters.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {visibleClasses.map((c) => (
          <ClassCard
            key={c.id}
            classId={c.id}
            course={c.course}
            section={c.section}
            classTiming={c.classTimings}
            examTiming={c.classExamTimings}
            professor={c.professor}
          />
        ))}
      </div>
      {/* Sentinel element for IntersectionObserver — triggers load on scroll */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          <span className="text-muted-foreground text-xs">Loading more...</span>
        </div>
      )}
    </div>
  );
};

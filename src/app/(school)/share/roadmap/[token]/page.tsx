import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { api } from "@/common/tools/trpc/server";
import { SharedRoadmapView } from "./SharedRoadmapView";
import type { Entry } from "@/modules/roadmaps/functions/conflicts";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SharedRoadmapPage(props: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await props.params;

  let data: Awaited<ReturnType<typeof api.sharing.getSharedRoadmap>>;
  try {
    data = await api.sharing.getSharedRoadmap({ token });
  } catch (e) {
    if (e instanceof TRPCError && e.code === "NOT_FOUND") {
      notFound();
    }
    throw e;
  }

  const entries: Entry[] = data.entries.map((e) => ({
    courseId: e.courseId,
    courseCode: e.course.code,
    courseName: e.course.name,
    creditUnits: e.course.creditUnits,
    description: e.course.description,
    yearNumber: e.yearNumber,
    term: e.term,
  }));

  return (
    <SharedRoadmapView
      roadmapId={data.roadmap.id}
      roadmapName={data.roadmap.name}
      ownerUsername={data.ownerUsername}
      entries={entries}
      token={token}
    />
  );
}

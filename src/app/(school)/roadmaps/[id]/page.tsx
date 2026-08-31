import { cache } from "react";
import { api } from "@/common/tools/trpc/server";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import type { Metadata } from "next";
import { PublicRoadmapView } from "./PublicRoadmapView";
import type { Entry } from "@/modules/roadmaps/functions/conflicts";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

/** Dedupe the getById call between generateMetadata and the page render. */
const getCachedRoadmap = cache(async (id: string) => {
  return api.roadmaps.getById({ id });
});

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  if (!id) return { title: "Roadmap Not Found" };

  try {
    const data = await getCachedRoadmap(id);
    return {
      title: `${data.roadmap.name} — Roadmap by ${data.ownerUsername}`,
      description: `A public degree roadmap by ${data.ownerUsername} with ${data.entries.length} courses.`,
    };
  } catch {
    return { title: "Roadmap Not Found" };
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PublicRoadmapPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  if (!id) notFound();

  let data: Awaited<ReturnType<typeof api.roadmaps.getById>>;
  try {
    data = await getCachedRoadmap(id);
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
    <PublicRoadmapView
      roadmapId={data.roadmap.id}
      roadmapName={data.roadmap.name}
      description={data.roadmap.description}
      ownerUsername={data.ownerUsername}
      ownerFaculty={data.ownerFaculty}
      publishedAt={data.roadmap.publishedAt}
      viewCount={data.roadmap.viewCount}
      shareCount={data.roadmap.shareCount}
      voteCount={data.voteCount}
      viewerHasVoted={data.viewerHasVoted}
      entries={entries}
    />
  );
}

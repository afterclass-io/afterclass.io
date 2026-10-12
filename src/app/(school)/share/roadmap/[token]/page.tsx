import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { api } from "@/common/tools/trpc/server";
import { SharedRoadmapView } from "./SharedRoadmapView";
import { toRoadmapEntries } from "@/modules/roadmaps/components/ReadOnlyRoadmapBody";

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

  return (
    <SharedRoadmapView
      roadmapId={data.roadmap.id}
      roadmapName={data.roadmap.name}
      ownerUsername={data.ownerUsername}
      entries={toRoadmapEntries(data.entries)}
      token={token}
    />
  );
}

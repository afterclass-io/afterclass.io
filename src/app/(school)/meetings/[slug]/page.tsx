import { cache } from "react";
import type { Metadata } from "next";
import { AuthWall } from "@/common/components/auth-wall";
import { ConstrainedContainer } from "@/common/components/constrained-container";
import { api } from "@/common/tools/trpc/server";
import { MeetingRoomView } from "@/modules/meetings/components/room/MeetingRoomView";
import { auth } from "@/server/auth";

const getCachedPoll = cache(async (slug: string) => {
  return api.meetings.getPollBySlug({ slug });
});

const NO_INDEX = { index: false, follow: false, nocache: true } as const;

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  if (!slug) return { title: "Meeting Not Found | Meetings" };

  // A poll link requires login, so anonymous visitors get generic metadata.
  if (!(await auth())) {
    return { title: "Meeting | Meetings", robots: NO_INDEX };
  }

  try {
    const data = await getCachedPoll(slug);
    return {
      title: `${data.poll.title} | Meetings`,
      description:
        data.poll.description ??
        "Coordinate group meeting availability on AfterClass.",
      alternates: { canonical: `/meetings/${slug}` },
      robots: NO_INDEX,
    };
  } catch {
    return { title: "Meeting Not Found | Meetings" };
  }
}

export default async function MeetingRoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!(await auth())) {
    return (
      <ConstrainedContainer>
        <AuthWall variant="full" feature="this meeting" />
      </ConstrainedContainer>
    );
  }

  return <MeetingRoomView slug={slug} />;
}

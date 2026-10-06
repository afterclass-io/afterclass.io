import { cache } from "react";
import type { Metadata } from "next";
import { api } from "@/common/tools/trpc/server";
import { MeetingRoomView } from "@/modules/meetings/components/room/MeetingRoomView";

const getCachedPoll = cache(async (slug: string) => {
  return api.meetings.getPollBySlug({ slug });
});

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  if (!slug) return { title: "Meeting Not Found | Meetings" };

  try {
    const data = await getCachedPoll(slug);
    return {
      title: `${data.poll.title} | Meetings`,
      description:
        data.poll.description ??
        "Coordinate group meeting availability on AfterClass.",
      alternates: { canonical: `/meetings/${slug}` },
      robots: { index: false, follow: false, nocache: true },
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
  return <MeetingRoomView slug={slug} />;
}

import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { AuthWall } from "@/common/components/auth-wall";
import { ConstrainedContainer } from "@/common/components/constrained-container";
import { api } from "@/common/tools/trpc/server";
import { auth } from "@/server/auth";
import { SharedTimetableView } from "./SharedTimetableView";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SharedTimetablePage(props: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await props.params;

  // A shared timetable carries class data and a private schedule: login only.
  if (!(await auth())) {
    return (
      <ConstrainedContainer>
        <AuthWall variant="full" feature="this timetable" />
      </ConstrainedContainer>
    );
  }

  let data: Awaited<ReturnType<typeof api.sharing.getSharedTimetable>>;
  try {
    data = await api.sharing.getSharedTimetable({ token });
  } catch (e) {
    if (e instanceof TRPCError && e.code === "NOT_FOUND") {
      notFound();
    }
    throw e;
  }

  return (
    <SharedTimetableView
      timetableName={data.timetable.name}
      ownerUsername={data.timetable.ownerUsername}
      slots={data.slots}
    />
  );
}

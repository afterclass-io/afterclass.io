import { Suspense } from "react";
import { MeetingsDashboardView } from "@/modules/meetings/components/dashboard/MeetingsDashboardView";

export default function MeetingsPage() {
  return (
    <Suspense fallback={null}>
      <MeetingsDashboardView />
    </Suspense>
  );
}

import { type Metadata } from "next";

import { AgentsPage } from "@/modules/settings/agents/agents-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AgentsPage />;
}

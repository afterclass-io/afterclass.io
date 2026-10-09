import { getEdgeConfig } from "@/server/ecfg/edge-config";
import { EdgeConfigContextProvider } from "./EdgeConfigContextProvider";

export async function EdgeConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const edgeConfig = await getEdgeConfig();

  return (
    <EdgeConfigContextProvider edgeConfig={edgeConfig}>
      {children}
    </EdgeConfigContextProvider>
  );
}

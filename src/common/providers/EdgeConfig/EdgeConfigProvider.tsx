import { getEdgeConfig } from "@/server/ecfg/edge-config";
import { EdgeConfigContextProvider } from "./EdgeConfigContextProvider";

export async function EdgeConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const edgeConfig = await getEdgeConfig();

  // `chat` holds server-only tunables (LLM model and base URL, limits). No
  // client code reads it, so it stays out of the browser payload.
  return (
    <EdgeConfigContextProvider edgeConfig={{ ...edgeConfig, chat: undefined }}>
      {children}
    </EdgeConfigContextProvider>
  );
}

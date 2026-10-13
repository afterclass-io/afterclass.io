import { EdgeConfigContext } from "@/common/providers/EdgeConfig/EdgeConfigContextProvider";
import { useContext } from "react";

export const useEdgeConfigs = () => useContext(EdgeConfigContext);

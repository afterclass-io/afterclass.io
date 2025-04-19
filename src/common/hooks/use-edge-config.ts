import { EdgeConfigContext } from "@/common/providers/EdgeConfig";
import { useContext } from "react";

export const useEdgeConfigs = () => useContext(EdgeConfigContext);

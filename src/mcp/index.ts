// src/mcp/index.ts — MCP CLI entry: default-export the server singleton,
// then register all tools/prompts/resources at module scope. The CLI reads
// the entry DEFAULT (`s.import(entry)).default` — see server.ts lazyServer
// NOTE); in-tree code imports the named `server` binding instead.
import { server } from "./server";

// View-bound ToolRefs (exported values feed mcp-env.d.ts):
export { searchCourses } from "./view-tools/search-courses";
export { getTimetableCalendarLink } from "./view-tools/get-timetable-calendar-link";
export { myBidPlan } from "./view-tools/my-bid-plan";
export { getMyRoadmap } from "./view-tools/get-my-roadmap";
export { getCourseReviews } from "./view-tools/get-course-reviews";
export { exploreBidOptions } from "./view-tools/explore-bid-options";
export { getMyTimetableDetail } from "./view-tools/get-my-timetable-detail";

export default server;

import { registerViewlessTools } from "./register";
import { registerPrompts } from "./prompts";
import { registerResources } from "./resources";

registerViewlessTools(server);
registerPrompts(server);
registerResources(server);

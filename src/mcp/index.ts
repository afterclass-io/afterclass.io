// src/mcp/index.ts — v2 entry (default export owned by the CLI)
export { server, default } from "./server";

// View-bound ToolRefs (exported values feed mcp-env.d.ts):
export { searchCourses } from "./view-tools/search-courses";
export { recommendBidAmount } from "./view-tools/recommend-bid-amount";
export { getTimetableCalendarLink } from "./view-tools/get-timetable-calendar-link";
export { myBidPlan } from "./view-tools/my-bid-plan";
export { getMyRoadmap } from "./view-tools/get-my-roadmap";
export { getCourseReviews } from "./view-tools/get-course-reviews";
export { exploreBidOptions } from "./view-tools/explore-bid-options";

import { server } from "./server";
import { registerViewlessTools } from "./register";
import { registerPrompts } from "./prompts";
import { registerResources } from "./resources";

registerViewlessTools(server);
registerPrompts(server);
registerResources(server);

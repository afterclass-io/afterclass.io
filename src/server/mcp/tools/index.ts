import type { McpTool } from "../types";

import {
  getClassesTool,
  getCourseTool,
  getProfessorTool,
  searchCoursesTool,
} from "./read/courses";
import {
  getBidPredictionTool,
  getBidResultsTool,
  getBidWindowsTool,
  getCourseReviewsTool,
  getProfessorReviewsTool,
  listAcadTermsTool,
} from "./read/catalog";
import { getContributeInfoTool } from "./read/contribute";
import {
  browsePublicRoadmapsTool,
  myBidsTool,
  myBudgetTool,
  myRoadmapsTool,
  myTimetablesTool,
} from "./read/mydata";
import { myBidPlanTool } from "./read/bid-plan";
import { getMyTimetableDetailTool } from "./read/timetable-detail";
import { getMyRoadmapTool, getPublicRoadmapTool } from "./read/roadmap-detail";
import { planSemesterTool } from "./read/plan-semester";
import { checkRoadmapFeasibilityTool } from "./read/feasibility";
import {
  addClassToTimetableTool,
  createTimetableTool,
  removeClassFromTimetableTool,
  removeTimetableTool,
  renameTimetableTool,
  setTimetableVisibilityTool,
} from "./write/timetable";
import { removeBidTool, setBidBudgetTool, upsertBidTool } from "./write/bids";
import {
  createRoadmapTool,
  removeRoadmapTool,
  renameRoadmapTool,
  saveRoadmapEntriesTool,
  setRoadmapVisibilityTool,
} from "./write/roadmaps";
import {
  copyPublicRoadmapTool,
  setActiveRoadmapTool,
  setMatricTermTool,
  syncRoadmapProgressTool,
} from "./write/roadmap-settings";
import { setBidStatusTool } from "./write/bid-status";
import { recommendBidAmountTool } from "./write/recommend";
import { getTimetableCalendarLinkTool } from "./write/calendar-link";
import { exploreBidOptionsTool } from "./read/explore-bid-options";

export const allTools: McpTool[] = [
  // read - courses / classes / professors
  searchCoursesTool,
  getCourseTool,
  getClassesTool,
  getProfessorTool,
  // read - catalog
  getCourseReviewsTool,
  getProfessorReviewsTool,
  getBidPredictionTool,
  getBidResultsTool,
  listAcadTermsTool,
  getBidWindowsTool,
  getContributeInfoTool,
  // read - own data
  myTimetablesTool,
  getMyTimetableDetailTool,
  myBidsTool,
  myBidPlanTool,
  myBudgetTool,
  myRoadmapsTool,
  browsePublicRoadmapsTool,
  getMyRoadmapTool,
  getPublicRoadmapTool,
  planSemesterTool,
  checkRoadmapFeasibilityTool,
  // write - timetables
  createTimetableTool,
  renameTimetableTool,
  removeTimetableTool,
  addClassToTimetableTool,
  removeClassFromTimetableTool,
  setTimetableVisibilityTool,
  getTimetableCalendarLinkTool,
  // write - bids
  upsertBidTool,
  removeBidTool,
  setBidBudgetTool,
  setBidStatusTool,
  // write - roadmaps
  createRoadmapTool,
  renameRoadmapTool,
  removeRoadmapTool,
  saveRoadmapEntriesTool,
  setRoadmapVisibilityTool,
  setMatricTermTool,
  setActiveRoadmapTool,
  syncRoadmapProgressTool,
  copyPublicRoadmapTool,
  // read-only recommendation
  recommendBidAmountTool,
  exploreBidOptionsTool,
];

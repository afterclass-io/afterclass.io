import type { Labels } from "@/generated/prisma/client";
import type {
  ReviewType,
  UniversityAbbreviation,
} from "@/generated/prisma/enums";

export type Review = {
  id: string;
  body: string;
  tips: string;
  rating: number;
  courseCode: string;
  courseName: string;
  username: string;
  likeCount: number;
  countEventViews: number;
  createdAt: number;
  reviewLabels: Pick<Labels, "name">[];
  university: UniversityAbbreviation;
  reviewFor: ReviewType;
  professorName?: string;
  professorSlug?: string;
};

import type {
  ReviewType,
  Labels,
  UniversityAbbreviation,
} from "@prisma/client";

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

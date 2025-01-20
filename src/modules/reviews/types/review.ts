import type {
  ReviewLabelType,
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
  createdAt: number;
  reviewLabels: Pick<Labels, "name">[];
  university: UniversityAbbreviation;
  reviewFor: ReviewLabelType;
  professorName?: string;
  professorSlug?: string;
};

import { ReviewableEnum } from "@/common/types/reviews";

export const texts = {
  COMBOBOX: {
    FIELD_LABEL: {
      [ReviewableEnum.COURSE]: "Course *",
      [ReviewableEnum.PROFESSOR]: "Professor *",
    },
    PLACEHOLDER: {
      [ReviewableEnum.COURSE]: "Search for a Course...",
      [ReviewableEnum.PROFESSOR]: "Search for a Prof...",
    },
    TRIGGER_LABEL: {
      [ReviewableEnum.COURSE]: "Select a Course",
      [ReviewableEnum.PROFESSOR]: "Select a Prof",
    },
  },
  RATING: {
    FIELD_LABEL: {
      [ReviewableEnum.COURSE]: "Rating *",
      [ReviewableEnum.PROFESSOR]: "Rating *",
    },
  },
  TAGS: {
    FIELD_LABEL: {
      [ReviewableEnum.COURSE]: "What do you like about this course? *",
      [ReviewableEnum.PROFESSOR]:
        "What do you like about this professor's course? *",
    },
  },
  BODY: {
    FIELD_LABEL: {
      [ReviewableEnum.COURSE]: "What do you like about this course? *",
      [ReviewableEnum.PROFESSOR]:
        "What do you like about this professor's course? *",
    },
    PLACEHOLDER: {
      [ReviewableEnum.COURSE]: "Start writing here",
      [ReviewableEnum.PROFESSOR]: "Start writing here",
    },
  },
  TIPS: {
    FIELD_LABEL: {
      [ReviewableEnum.COURSE]: "Tips to excel in this course",
      [ReviewableEnum.PROFESSOR]: "Tips for this professor's course",
    },
    PLACEHOLDER: {
      [ReviewableEnum.COURSE]: "Start writing here",
      [ReviewableEnum.PROFESSOR]: "Start writing here",
    },
  },
};

import { MIN_QUERY_LEN } from "@/common/constants/search";

export const texts = {
  COMBOBOX: {
    PLACEHOLDER: {
      course: "Filter for a Course...",
      professor: "Filter for a Prof...",
    },
    HINT: {
      course: `Type ${MIN_QUERY_LEN} or more characters to find a course.`,
      professor: `Type ${MIN_QUERY_LEN} or more characters to find a professor.`,
    },
    TRIGGER_LABEL: {
      course: "Select a Course",
      professor: "Select a Prof",
    },
  },
};

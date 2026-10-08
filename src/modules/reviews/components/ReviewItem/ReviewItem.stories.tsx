import type { Meta, StoryObj } from "@storybook/nextjs";

import { ReviewItem } from "./ReviewItem";
import { ReviewType, UniversityAbbreviation } from "@/generated/prisma/enums";
import { type Review } from "@/modules/reviews/types";

const review = {
  id: "1",
  body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec auctor nunc a velit congue, et faucibus sapien iaculis. Quisque id felis non sapien egestas ultricies vulputate posuere quam. Vestibulum scelerisque arcu leo, sit amet interdum enim suscipit ut. Sed dolor turpis, tincidunt sed elementum at, posuere ac justo. Curabitur sem turpis, porttitor at ante sed, laoreet condimentum magna. Suspendisse ex orci, laoreet in cursus nec, rhoncus quis eros. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Aliquam lacinia varius quam, ut blandit quam suscipit nec. Morbi facilisis mauris erat, quis porttitor purus consequat id. Maecenas.",
  tips: "",
  rating: 4,
  courseCode: "COR-MGMT1302",
  courseName: "Some Course Name",
  username: "Anonymous",
  likeCount: 10,
  countEventViews: 1234,
  createdAt: 1705745162,
  university: UniversityAbbreviation.SMU,
  reviewFor: ReviewType.PROFESSOR,
  professorName: "John Doe",
  reviewLabels: [
    { name: "ENGAGING" },
    { name: "FAIR_GRADING" },
    {
      name: "EFFECTIVE_TEACHING",
    },
    {
      name: "INTERESTING",
    },
    {
      name: "PRACTICAL",
    },
    {
      name: "GAINED_NEW_SKILLS",
    },
  ],
} satisfies Review;

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/ReviewItem",
  component: ReviewItem,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {
    review: review,
    isLocked: false,
    isMocked: true,
  },
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof ReviewItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultHomePage: Story = {
  args: {
    variant: "home",
  },
};
export const LockedHomePage: Story = {
  ...DefaultHomePage,
  args: {
    ...DefaultHomePage.args,
    isLocked: true,
  },
};
export const DefaultProfessorPage: Story = {
  ...DefaultHomePage,
  args: {
    ...DefaultHomePage.args,
    variant: "professor",
  },
};
export const LockedProfessorPage: Story = {
  ...DefaultProfessorPage,
  args: {
    ...DefaultProfessorPage.args,
    isLocked: true,
  },
};
export const DefaultCoursePage: Story = {
  ...DefaultHomePage,
  args: {
    ...DefaultHomePage.args,
    variant: "course",
  },
};
export const LockedCoursePage: Story = {
  ...DefaultCoursePage,
  args: {
    ...DefaultCoursePage.args,
    isLocked: true,
  },
};

export const HomePageLongProfessorName: Story = {
  ...DefaultHomePage,
  args: {
    ...DefaultHomePage.args,
    review: { ...review, professorName: "Chiraphol New Chiyachantana" },
  },
};

export const CoursePageLongProfessorName: Story = {
  ...DefaultCoursePage,
  args: {
    ...DefaultCoursePage.args,
    review: { ...review, professorName: "Chiraphol New Chiyachantana" },
  },
};

const wrapper320: Story["decorators"] = [
  (Story) => (
    <div className="w-[320px]" style={{ width: 320 }}>
      <Story />
    </div>
  ),
];

const longCourseCodeReview: Review = {
  ...review,
  courseCode: "IS415-GEOSPATIAL-ANALYTICS-AND-APPLICATIONS",
  courseName: "Geospatial Analytics and Applications",
};

const unbrokenCourseCodeReview: Review = {
  ...review,
  courseCode: "VERYLONGSINGLECOURSECODEWITHOUTSPACESORHYPHENS",
  courseName: "Very Long Single Course Code Without Spaces",
};

const longNameAndCodeReview: Review = {
  ...review,
  professorName: "Chiraphol New Chiyachantana",
  professorSlug: "chiraphol-new-chiyachantana",
  courseCode: "IS415-GEOSPATIAL-ANALYTICS-AND-APPLICATIONS",
  courseName: "Geospatial Analytics and Applications",
};

const longUsernameReview: Review = {
  ...review,
  username: "A Very Long Username That Tests Header Wrapping",
};

// Home variant stories (320px wrapper)
export const HomeLongCourseCode: Story = {
  args: {
    ...DefaultHomePage.args,
    review: longCourseCodeReview,
  },
  decorators: wrapper320,
};

export const HomeLongCourseCodeLocked: Story = {
  ...HomeLongCourseCode,
  args: {
    ...HomeLongCourseCode.args,
    isLocked: true,
  },
};

export const HomeUnbrokenCourseCode: Story = {
  args: {
    ...DefaultHomePage.args,
    review: unbrokenCourseCodeReview,
  },
  decorators: wrapper320,
};

export const HomeUnbrokenCourseCodeLocked: Story = {
  ...HomeUnbrokenCourseCode,
  args: {
    ...HomeUnbrokenCourseCode.args,
    isLocked: true,
  },
};

export const HomeLongNameAndCode: Story = {
  args: {
    ...DefaultHomePage.args,
    review: longNameAndCodeReview,
  },
  decorators: wrapper320,
};

export const HomeLongNameAndCodeLocked: Story = {
  ...HomeLongNameAndCode,
  args: {
    ...HomeLongNameAndCode.args,
    isLocked: true,
  },
};

export const HomeLongUsername: Story = {
  args: {
    ...DefaultHomePage.args,
    review: longUsernameReview,
  },
  decorators: wrapper320,
};

export const HomeLongUsernameLocked: Story = {
  ...HomeLongUsername,
  args: {
    ...HomeLongUsername.args,
    isLocked: true,
  },
};

// Professor variant stories (320px wrapper)
export const ProfessorLongCourseCode: Story = {
  args: {
    ...DefaultProfessorPage.args,
    review: longCourseCodeReview,
  },
  decorators: wrapper320,
};

export const ProfessorLongCourseCodeLocked: Story = {
  ...ProfessorLongCourseCode,
  args: {
    ...ProfessorLongCourseCode.args,
    isLocked: true,
  },
};

export const ProfessorUnbrokenCourseCode: Story = {
  args: {
    ...DefaultProfessorPage.args,
    review: unbrokenCourseCodeReview,
  },
  decorators: wrapper320,
};

export const ProfessorUnbrokenCourseCodeLocked: Story = {
  ...ProfessorUnbrokenCourseCode,
  args: {
    ...ProfessorUnbrokenCourseCode.args,
    isLocked: true,
  },
};

export const ProfessorLongNameAndCode: Story = {
  args: {
    ...DefaultProfessorPage.args,
    review: longNameAndCodeReview,
  },
  decorators: wrapper320,
};

export const ProfessorLongNameAndCodeLocked: Story = {
  ...ProfessorLongNameAndCode,
  args: {
    ...ProfessorLongNameAndCode.args,
    isLocked: true,
  },
};

export const ProfessorLongUsername: Story = {
  args: {
    ...DefaultProfessorPage.args,
    review: longUsernameReview,
  },
  decorators: wrapper320,
};

export const ProfessorLongUsernameLocked: Story = {
  ...ProfessorLongUsername,
  args: {
    ...ProfessorLongUsername.args,
    isLocked: true,
  },
};

// Course variant stories (320px wrapper)
export const CourseLongCourseCode: Story = {
  args: {
    ...DefaultCoursePage.args,
    review: longCourseCodeReview,
  },
  decorators: wrapper320,
};

export const CourseLongCourseCodeLocked: Story = {
  ...CourseLongCourseCode,
  args: {
    ...CourseLongCourseCode.args,
    isLocked: true,
  },
};

export const CourseUnbrokenCourseCode: Story = {
  args: {
    ...DefaultCoursePage.args,
    review: unbrokenCourseCodeReview,
  },
  decorators: wrapper320,
};

export const CourseUnbrokenCourseCodeLocked: Story = {
  ...CourseUnbrokenCourseCode,
  args: {
    ...CourseUnbrokenCourseCode.args,
    isLocked: true,
  },
};

export const CourseLongNameAndCode: Story = {
  args: {
    ...DefaultCoursePage.args,
    review: longNameAndCodeReview,
  },
  decorators: wrapper320,
};

export const CourseLongNameAndCodeLocked: Story = {
  ...CourseLongNameAndCode,
  args: {
    ...CourseLongNameAndCode.args,
    isLocked: true,
  },
};

export const CourseLongUsername: Story = {
  args: {
    ...DefaultCoursePage.args,
    review: longUsernameReview,
  },
  decorators: wrapper320,
};

export const CourseLongUsernameLocked: Story = {
  ...CourseLongUsername,
  args: {
    ...CourseLongUsername.args,
    isLocked: true,
  },
};

import type { Meta, StoryObj } from "@storybook/nextjs";

import { ReviewItem } from "./ReviewItem";
import {
  ReviewReactionType,
  ReviewType,
  UniversityAbbreviation,
} from "@/generated/prisma/enums";
import { type Review } from "@/common/types/reviews";

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
export const WithEngagement: Story = {
  ...DefaultHomePage,
  args: {
    ...DefaultHomePage.args,
    review: {
      ...review,
      engagement: {
        viewerVote: 1,
        viewerReaction: ReviewReactionType.LIKE,
        reactionCounts: [
          { reaction: ReviewReactionType.LIKE, count: 5 },
          { reaction: ReviewReactionType.SLAY, count: 2 },
        ],
        shareCount: 3,
      },
    },
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

// A phone screen minus the page padding (375 px wide).
const phoneWidth: Story["decorators"] = [
  (Story) => (
    <div style={{ width: 343 }}>
      <Story />
    </div>
  ),
];

const longNameAndCodeReview: Review = {
  ...review,
  professorName: "Chiraphol New Chiyachantana",
  professorSlug: "chiraphol-new-chiyachantana",
  courseCode: "IS415-GEOSPATIAL-ANALYTICS-AND-APPLICATIONS",
  courseName: "Geospatial Analytics and Applications",
};

export const HomeLongNameAndCode: Story = {
  args: { ...DefaultHomePage.args, review: longNameAndCodeReview },
  decorators: phoneWidth,
};

export const ProfessorLongNameAndCode: Story = {
  args: { ...DefaultProfessorPage.args, review: longNameAndCodeReview },
  decorators: phoneWidth,
};

export const CourseLongNameAndCode: Story = {
  args: { ...DefaultCoursePage.args, review: longNameAndCodeReview },
  decorators: phoneWidth,
};

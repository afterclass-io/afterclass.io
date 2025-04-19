import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { ReviewType } from "@prisma/client";

import { FilterToggleSection } from "./FilterToggleSection";
import { type FilterItem } from "./FilterToggleSectionItem";
import {
  BooksIcon,
  GraduationCapIcon,
  PencilIcon,
} from "@/common/components/CustomIcon";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/FilterToggleSection",
  component: FilterToggleSection,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {},
  args: {},
} satisfies Meta<typeof FilterToggleSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [selectedItems, setSelectedItems] = useState<FilterItem["value"][]>(
      [],
    );
    return (
      <FilterToggleSection>
        <FilterToggleSection.Header type={ReviewType.PROFESSOR} />
        <FilterToggleSection.Items>
          {[
            {
              label: "Alexander the Great",
              value: "alexander-the-great",
              filterStats: [
                { icon: <PencilIcon />, stat: 10 },
                { icon: <BooksIcon />, stat: 20 },
              ],
            },
            {
              label: "John Doe",
              value: "john-doe",
              filterStats: [
                { icon: <PencilIcon />, stat: 10 },
                { icon: <BooksIcon />, stat: 20 },
              ],
            },
            {
              label: "Julius Caesar",
              value: "julius-caesar",
              filterStats: [
                { icon: <PencilIcon />, stat: 10 },
                { icon: <BooksIcon />, stat: 20 },
              ],
            },
          ].map((item, index) => (
            <FilterToggleSection.Item
              key={index}
              {...item}
              onClick={() => {
                if (selectedItems.includes(item.value)) {
                  setSelectedItems(
                    selectedItems.filter((v) => v !== item.value),
                  );
                } else {
                  setSelectedItems([...selectedItems, item.value]);
                }
              }}
              selected={selectedItems.includes(item.value)}
            />
          ))}
        </FilterToggleSection.Items>
      </FilterToggleSection>
    );
  },
};

export const WithSubHeader: Story = {
  render: () => {
    const [selectedItems, setSelectedItems] = useState<FilterItem["value"][]>(
      [],
    );
    return (
      <FilterToggleSection>
        <FilterToggleSection.Header type={ReviewType.COURSE} />
        <FilterToggleSection.Items>
          {[
            {
              label: "AI: Past, Present, and Future",
              sublabel: "COR1234",
              value: "COR1234",
              filterStats: [
                { icon: <PencilIcon />, stat: 10 },
                { icon: <GraduationCapIcon />, stat: 20 },
              ],
            },
            {
              label: "Business, Government and Society",
              sublabel: "COR2224",
              value: "COR2224",
              filterStats: [
                { icon: <PencilIcon />, stat: 10 },
                { icon: <GraduationCapIcon />, stat: 20 },
              ],
            },
            {
              label: "Web Application Development II",
              sublabel: "IS216",
              value: "COR2224",
              filterStats: [
                { icon: <PencilIcon />, stat: 10 },
                { icon: <GraduationCapIcon />, stat: 20 },
              ],
            },
          ].map((item, index) => (
            <FilterToggleSection.Item
              key={index}
              {...item}
              onClick={() => {
                if (selectedItems.includes(item.value)) {
                  setSelectedItems(
                    selectedItems.filter((v) => v !== item.value),
                  );
                } else {
                  setSelectedItems([...selectedItems, item.value]);
                }
              }}
              selected={selectedItems.includes(item.value)}
            />
          ))}
        </FilterToggleSection.Items>
      </FilterToggleSection>
    );
  },
};

export const Locked: Story = {
  args: {
    isLocked: true,
  },
};

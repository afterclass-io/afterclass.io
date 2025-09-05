import type { Meta, StoryObj } from "@storybook/react";
import { ModAlternativesCard } from "./ModAlternativesCard";

const selectedModule = {
  instructor: "Tan XX",
  day: "Tue",
  time: "08:15-11:30",
  vacancies: "0/48",
  change: 0,
  min: 34.42,
  median: 34.48,
};

const similarModules = [
  {
    instructor: "Tan XX",
    day: "Tue",
    time: "08:15-11:30",
    vacancies: "0/48",
    change: -3,
    min: 34.42,
    median: 34.48,
  },
  {
    instructor: "James Wong",
    day: "Tue",
    time: "08:15-11:30",
    vacancies: "3/48",
    change: -3,
    min: 34.42,
    median: 34.48,
  },
  {
    instructor: "Tan XX",
    day: "Mon",
    time: "14:00-17:30",
    vacancies: "5/48",
    change: 5,
    min: 25.0,
    median: 28.5,
  },
];

const meta: Meta<typeof ModAlternativesCard> = {
  title: "Bid Analytics/ModAlternativesCard",
  component: ModAlternativesCard,
  tags: ["autodocs"],
  args: {
    selectedModule: selectedModule,
    similarModules: similarModules,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OnlyByInstructor: Story = {
  args: {
    selectedModule: selectedModule,
    similarModules: similarModules.filter(
      (mod) =>
        mod.instructor === selectedModule.instructor &&
        (mod.day !== selectedModule.day || mod.time !== selectedModule.time),
    ),
  },
};

export const OnlyByTime: Story = {
  args: {
    selectedModule: selectedModule,
    similarModules: similarModules.filter(
      (mod) =>
        mod.instructor !== selectedModule.instructor &&
        mod.day === selectedModule.day &&
        mod.time === selectedModule.time,
    ),
  },
};

export const Empty: Story = {
  args: {
    selectedModule: selectedModule,
    similarModules: [],
  },
};
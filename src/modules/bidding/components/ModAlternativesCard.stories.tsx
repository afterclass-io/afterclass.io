import type { Meta, StoryObj } from "@storybook/react";
// Assuming you've removed ClassDetails and ModuleSummary from the component file
import { ModAlternativesCard } from "./ModAlternativesCard"; 

// --- Mock Data Structures matching ModAlternativesCardProps arrays ---

// Mock Professors Array (includes the original professor and an alternative)
const MOCK_PROFESSORS = [
    {
        name: "Rand HIRMIZ",
        slug: "rand-hirmiz",
    },
    {
        name: "Dr. Alicia Lim",
        slug: "alicia-lim",
    },
];

// Mock Sessions Array (includes the original session and a different session)
const MOCK_SESSIONS = [
    {
        dayOfWeek: "Mon",
        startTime: "15:30",
        endTime: "18:45",
    },
    {
        dayOfWeek: "Wed",
        startTime: "09:00",
        endTime: "12:15",
    },
    // Include a duplicate to test the deduplication logic in the component
    {
        dayOfWeek: "Mon",
        startTime: "15:30",
        endTime: "18:45",
    },
];

// --- Storybook Meta ---

const meta: Meta<typeof ModAlternativesCard> = {
    title: "Bid Analytics/ModAlternativesCard",
    component: ModAlternativesCard,
    tags: ["autodocs"],
    args: {
        courseCode: "COR1701",
        professors: MOCK_PROFESSORS,
        sessions: MOCK_SESSIONS,
    },
};

export default meta;

type Story = StoryObj<typeof meta>;

// --- Stories ---

export const Default: Story = {
    // Shows two professors and two unique session links
    name: "Full Alternatives List",
};

export const OnlyProfessors: Story = {
    args: {
        ...meta.args,
        professors: MOCK_PROFESSORS,
        sessions: [], // No session times available
    },
    name: "Only Professor Alternatives",
};

export const OnlySessionTimes: Story = {
    args: {
        ...meta.args,
        professors: [], // No alternative professors
        sessions: MOCK_SESSIONS,
    },
    name: "Only Session Time Alternatives",
};

export const Empty: Story = {
    args: {
        ...meta.args,
        professors: [],
        sessions: [],
    },
    name: "No Alternatives (Should Render Null/Empty)",
};
import { randomUUID } from "crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { type Prisma, PrismaClient } from "@/generated/prisma/client";

import acadTermsData from "./data/14_acad_terms.json";
import bidPredictionData from "./data/21_bid_predictions.json";
import bidResultData from "./data/19_bid_result.json";
import bidWindowData from "./data/18_bid_window.json";
import classesData from "./data/7_classes.json";
import classAvailabilityData from "./data/17_class_availability.json";
import classExamTimingsData from "./data/16_class_exam_timings.json";
import classTimingsData from "./data/15_class_timings.json";
import coursesData from "./data/3_courses.json";
import facultiesData from "./data/2_faculties.json";
import hackSubmissionData from "./data/20_hack_submissions.json";
import labelsData from "./data/8_labels.json";
import professorFacultiesData from "./data/6_professor_faculties.json";
import professorsData from "./data/5_professors.json";
import reviewLabelsData from "./data/10_review_labels.json";
import reviewReactionsData from "./data/13_review_reactions.json";
import reviewVotesData from "./data/11_review_votes.json";
import reviewsData from "./data/9_reviews.json";
import safetyFactorData from "./data/22_safety_factors.json";
import universitiesData from "./data/1_universities.json";
import universityDomainsData from "./data/12_university_domains.json";
import userBidBudgetsData from "./data/27_user_bid_budgets.json";
import userBidsData from "./data/28_user_bids.json";
import userRoadmapEntriesData from "./data/26_user_roadmap_entries.json";
import userRoadmapsData from "./data/25_user_roadmaps.json";
import userTimetableSlotsData from "./data/24_user_timetable_slots.json";
import userTimetablesData from "./data/23_user_timetables.json";
import usersData from "./data/4_users.json";
import { assertStrictTimeFormats } from "./validate-seed-data";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.universities.createMany({
    data: universitiesData as Prisma.UniversitiesCreateManyInput[],
  });

  await prisma.faculties.createMany({
    data: facultiesData,
  });

  await prisma.courses.createMany({
    data: coursesData,
  });

  await prisma.users.createMany({
    data: usersData,
  });

  await prisma.professors.createMany({
    data: professorsData,
  });

  await prisma.professorFaculties.createMany({
    data: professorFacultiesData,
  });

  // Ordered before classes as classes refers to acadTermId.
  await prisma.acadTerm.createMany({
    data: acadTermsData,
  });

  await prisma.classes.createMany({
    data: classesData as Prisma.ClassesCreateManyInput[],
  });

  await prisma.labels.createMany({
    data: labelsData as Prisma.LabelsCreateManyInput[],
  });

  await prisma.reviews.createMany({
    data: reviewsData,
  });

  await prisma.reviewLabels.createMany({
    data: reviewLabelsData,
  });

  await prisma.reviewVotes.createMany({
    data: reviewVotesData,
  });

  await prisma.universityDomains.createMany({
    data: universityDomainsData,
  });

  await prisma.reviewReactions.createMany({
    data: reviewReactionsData as Prisma.ReviewReactionsCreateManyInput[],
  });

  assertStrictTimeFormats(classTimingsData, "15_class_timings.json");
  await prisma.classTiming.createMany({
    data: classTimingsData,
  });

  assertStrictTimeFormats(classExamTimingsData, "16_class_exam_timings.json");
  await prisma.classExamTiming.createMany({
    data: classExamTimingsData,
  });

  // Changed order to load in bidWindow first before classAvailability
  await prisma.bidWindow.createMany({
    data: bidWindowData,
  });

  await prisma.classAvailability.createMany({
    data: classAvailabilityData,
  });

  await prisma.bidResult.createMany({
    data: bidResultData,
  });

  await prisma.safetyFactor.createMany({
    data: safetyFactorData as Prisma.SafetyFactorCreateManyInput[],
    skipDuplicates: true,
  });

  await prisma.bidPrediction.createMany({
    data: bidPredictionData,
    skipDuplicates: true,
  });

  await prisma.hackSubmission.createMany({
    data: hackSubmissionData,
  });

  // === Planning integration seed data ===

  await prisma.userTimetable.createMany({
    data: userTimetablesData as Prisma.UserTimetableCreateManyInput[],
  });

  await prisma.userTimetableSlot.createMany({
    data: userTimetableSlotsData,
  });

  await prisma.userRoadmap.createMany({
    data: userRoadmapsData as Prisma.UserRoadmapCreateManyInput[],
  });

  await prisma.userRoadmapEntry.createMany({
    data: userRoadmapEntriesData,
  });

  await prisma.userBidBudget.createMany({
    data: userBidBudgetsData,
  });

  await prisma.userBid.createMany({
    data: userBidsData as Prisma.UserBidCreateManyInput[],
  });

  // === Group Meetings availability coordination seed data ===

  // Demo teammates (Alice Tan, Ben Lim, Chloe Ong) are defined in
  // data/4_users.json so the meeting room reads like production.
  const demoTeammateIds = [
    "3f9a6c52-8d1e-4b7a-9c20-1a2b3c4d5e01",
    "3f9a6c52-8d1e-4b7a-9c20-1a2b3c4d5e02",
    "3f9a6c52-8d1e-4b7a-9c20-1a2b3c4d5e03",
  ] as const;

  await prisma.meetingPoll.createMany({
    data: [
      {
        id: "d3b07384-d113-4603-a1c7-c752b7194601",
        slug: "xK9mP2vL7q",
        title: "IS215 Group Project Sync",
        description: "Coordination for Sprint 1 milestones and deliverables.",
        agenda:
          "1. Review Sprint 1 deliverables\n2. Assign Sprint 2 tasks\n3. Agree on demo date",
        links: ["https://meet.google.com/abc-defg-hij"],
        creatorId: "85498973-b416-45d4-a3d1-fe8d7d2d5821",
        courseId: "2a45bab1-5ec4-4d2e-b245-27a142a78890",
        section: "G1",
        teamIdentifier: "Team 3",
        acadTermId: "AY202627T1",
        startDate: new Date("2026-10-12"),
        endDate: new Date("2026-10-16"),
        startHour: 8,
        endHour: 22,
        slotDurationMinutes: 15,
      },
      {
        id: "a1c08495-e224-4714-b2d8-d863c8205712",
        slug: "vN8wQ3zR5k",
        title: "IS215 Final Presentation Dry Run",
        description: "Rehearsal for final presentation slides and demo.",
        creatorId: "85498973-b416-45d4-a3d1-fe8d7d2d5821",
        courseId: "2a45bab1-5ec4-4d2e-b245-27a142a78890",
        section: "G1",
        teamIdentifier: "Team 3",
        acadTermId: "AY202627T1",
        startDate: new Date("2026-10-19"),
        endDate: new Date("2026-10-23"),
        startHour: 9,
        endHour: 18,
        slotDurationMinutes: 15,
      },
      {
        id: "b7e29183-c335-4925-a3d9-e974d9316823",
        slug: "qP4mR9sT2w",
        title: "CS201 Algorithm Study Group",
        description: "Weekly problem solving session for dynamic programming and graph algorithms.",
        agenda:
          "1. Review LeetCode Hard problems\n2. Discuss Dijkstra vs A* search\n3. Mock interview practice",
        creatorId: demoTeammateIds[0],
        courseId: "2a45bab1-5ec4-4d2e-b245-27a142a78890",
        section: "G2",
        teamIdentifier: "Study Group A",
        acadTermId: "AY202627T1",
        startDate: new Date("2026-10-14"),
        endDate: new Date("2026-10-18"),
        startHour: 10,
        endHour: 20,
        slotDurationMinutes: 15,
      },
      {
        id: "c8f30294-d446-4036-b4ea-f085ea427934",
        slug: "mK7vX2yZ9p",
        title: "SMU Hackathon Team Brainstorm",
        description: "Ideation and pitch deck drafting for the upcoming fintech hackathon.",
        creatorId: demoTeammateIds[2],
        teamIdentifier: "FinTech Hackers",
        acadTermId: "AY202627T1",
        startDate: new Date("2026-10-24"),
        endDate: new Date("2026-10-28"),
        startHour: 12,
        endHour: 22,
        slotDurationMinutes: 30,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.meetingParticipant.createMany({
    data: [
      {
        id: "e4a18274-9843-4e3a-9694-555566667777",
        pollId: "d3b07384-d113-4603-a1c7-c752b7194601",
        userId: "85498973-b416-45d4-a3d1-fe8d7d2d5821",
        availableSlots: [0, 1, 2, 3, 8, 9, 10, 11],
        ifNeededSlots: [4, 5, 12, 13],
      },
      {
        id: "f5b29385-a954-4f4b-a705-666677778888",
        pollId: "d3b07384-d113-4603-a1c7-c752b7194601",
        userId: demoTeammateIds[0],
        availableSlots: [0, 1, 8, 9, 16, 17],
        ifNeededSlots: [2, 3, 10, 11],
      },
      {
        id: "f5b29385-a954-4f4b-a705-666677778889",
        pollId: "d3b07384-d113-4603-a1c7-c752b7194601",
        userId: demoTeammateIds[1],
        availableSlots: [0, 1, 2, 8, 9, 10, 16, 17],
        ifNeededSlots: [3, 11],
      },
      {
        id: "f5b29385-a954-4f4b-a705-666677778890",
        pollId: "d3b07384-d113-4603-a1c7-c752b7194601",
        userId: demoTeammateIds[2],
        availableSlots: [8, 9, 10, 11, 16, 17],
        ifNeededSlots: [0, 1],
      },
      {
        id: "c7d30496-b065-4a5c-b816-777788889999",
        pollId: "a1c08495-e224-4714-b2d8-d863c8205712",
        userId: "85498973-b416-45d4-a3d1-fe8d7d2d5821",
        availableSlots: [4, 5, 6, 7],
        ifNeededSlots: [],
      },
      {
        id: "d8e40597-c176-4b6d-c927-888899990001",
        pollId: "b7e29183-c335-4925-a3d9-e974d9316823",
        userId: demoTeammateIds[0],
        availableSlots: [4, 5, 12, 13, 20, 21],
        ifNeededSlots: [6, 14],
      },
      {
        id: "d8e40597-c176-4b6d-c927-888899990002",
        pollId: "b7e29183-c335-4925-a3d9-e974d9316823",
        userId: demoTeammateIds[1],
        availableSlots: [4, 5, 12, 20],
        ifNeededSlots: [13, 21],
      },
      {
        id: "d8e40597-c176-4b6d-c927-888899990003",
        pollId: "c8f30294-d446-4036-b4ea-f085ea427934",
        userId: demoTeammateIds[2],
        availableSlots: [0, 1, 2, 8, 9],
        ifNeededSlots: [3, 10],
      },
    ],
    skipDuplicates: true,
  });

  // Cypress E2E test user — idempotent upsert so `prisma db seed` is the
  // single source of truth (supersedes scripts/create-cypress-test-user.ts).
  // Password is "Test1234!" (hash must stay in sync with cypress.env.json).
  // Gated to non-production: known password must never be seeded in prod.
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    const smu = await prisma.universities.findFirst({
      where: { abbrv: "SMU" },
    });
    if (smu) {
      const hash =
        "$2b$10$zk1rgDGgCcuZj096Z8sIcurZhBJEE6wkcdJ2BqMiW35cGyuFLb10G";
      await prisma.users.upsert({
        where: { email: "cypress_test@smu.edu.sg" },
        update: { deprecatedPasswordDigest: hash },
        create: {
          id: randomUUID(),
          email: "cypress_test@smu.edu.sg",
          username: `cypress_${Date.now().toString(36)}`,
          isVerified: true,
          universityId: smu.id,
          deprecatedPasswordDigest: hash,
          firstName: "Cypress",
          lastName: "Test",
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

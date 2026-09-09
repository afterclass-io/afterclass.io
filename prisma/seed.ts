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

  // Cypress E2E test user — idempotent upsert so `prisma db seed` is the
  // single source of truth (supersedes scripts/create-cypress-test-user.ts).
  // Password is "Test1234!" (hash must stay in sync with cypress.env.json).
  // Gated to non-production: known password must never be seeded in prod.
  if (process.env.NODE_ENV !== "production") {
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

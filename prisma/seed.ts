import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const universities = require("./data/1_universities.json");
  await prisma.universities.createMany({
    data: universities,
  });

  const faculties = require("./data/2_faculties.json");
  await prisma.faculties.createMany({
    data: faculties,
  });

  const courses = require("./data/3_courses.json");
  await prisma.courses.createMany({
    data: courses,
  });

  const users = require("./data/4_users.json");
  await prisma.users.createMany({
    data: users,
  });

  const professors = require("./data/5_professors.json");
  await prisma.professors.createMany({
    data: professors,
  });

  const professorFaculties = require("./data/6_professor_faculties.json");
  await prisma.professorFaculties.createMany({
    data: professorFaculties,
  });

  // Ordered before classes as classes refers to acadTermId.
  const acadTerms = require("./data/14_acad_terms.json");
  await prisma.acadTerm.createMany({
    data: acadTerms,
  });

  const classes = require("./data/7_classes.json");
  await prisma.classes.createMany({
    data: classes,
  });

  const labels = require("./data/8_labels.json");
  await prisma.labels.createMany({
    data: labels,
  });

  const reviews = require("./data/9_reviews.json");
  await prisma.reviews.createMany({
    data: reviews,
  });

  const reviewLabels = require("./data/10_review_labels.json");
  await prisma.reviewLabels.createMany({
    data: reviewLabels,
  });

  const reviewVotes = require("./data/11_review_votes.json");
  await prisma.reviewVotes.createMany({
    data: reviewVotes,
  });

  const universityDomain = require("./data/12_university_domains.json");
  await prisma.universityDomains.createMany({
    data: universityDomain,
  });

  const reviewReactions = require("./data/13_review_reactions.json");
  await prisma.reviewReactions.createMany({
    data: reviewReactions,
  });

  const classTimings = require("./data/15_class_timings.json");
  await prisma.classTiming.createMany({
    data: classTimings,
  });

  const classExamTimings = require("./data/16_class_exam_timings.json");
  await prisma.classExamTiming.createMany({
    data: classExamTimings,
  });

  // Changed order to load in bidWindow first before classAvailability
  const bidWindow = require("./data/18_bid_window.json");
  await prisma.bidWindow.createMany({
    data: bidWindow,
  });

  const classAvailability = require("./data/17_class_availability.json");
  await prisma.classAvailability.createMany({
    data: classAvailability,
  });

  const bidResult = require("./data/19_bid_result.json");
  await prisma.bidResult.createMany({
    data: bidResult,
  });

    const safetyFactor = require("./data/22_safety_factors.json");
  await prisma.safetyFactor.createMany({ data: safetyFactor, skipDuplicates: true });

const bidPrediction = require("./data/21_bid_predictions.json");
  await prisma.bidPrediction.createMany({
    data: bidPrediction,
    skipDuplicates: true,
  });

  const hackSubmission = require("./data/20_hack_submissions.json");
  await prisma.hackSubmission.createMany({
    data: hackSubmission,
  });

// === Planning integration seed data ===

  const userTimetables = require("./data/23_user_timetables.json");
  await prisma.userTimetable.createMany({
    data: userTimetables,
  });

  const userTimetableSlots = require("./data/24_user_timetable_slots.json");
  await prisma.userTimetableSlot.createMany({
    data: userTimetableSlots,
  });

  const userBidBudgets = require("./data/27_user_bid_budgets.json");
  await prisma.userBidBudget.createMany({
    data: userBidBudgets,
  });

  const userBids = require("./data/28_user_bids.json");
  await prisma.userBid.createMany({
    data: userBids,
  });
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

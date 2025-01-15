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

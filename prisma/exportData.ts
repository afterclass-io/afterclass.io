import { PrismaClient } from "@prisma/client";
import * as fs from 'fs/promises';
import * as path from 'path';

const prisma = new PrismaClient();

// Define a type for all valid model keys used in the mapping.
// This ensures type safety when accessing prisma[modelName].
type ModelKey = 
  'universities' | 'faculties' | 'courses' | 'users' | 'professors' | 'professorFaculties' | 
  'classes' | 'labels' | 'reviews' | 'reviewLabels' | 'reviewVotes' | 'universityDomains' | 
  'reviewReactions' | 'acadTerm' | 'classTiming' | 'classExamTiming' | 'classAvailability' |
  'bidWindow' | 'bidResult' | 'hackSubmission';

// Configuration
const OUTPUT_DIR = 'prisma/dataNEW';

/**
 * MAPPING: Defines the filename and corresponding Prisma model accessor.
 * Keys are the exact accessors used in the Prisma Client (e.g., prisma.universities).
 */
const EXPORT_MAPPING: Record<ModelKey, string> = {
  // Plural, lowercase accessors
  universities: '1_universities.json',
  faculties: '2_faculties.json',
  courses: '3_courses.json',
  users: '4_users.json',
  professors: '5_professors.json',
  professorFaculties: '6_professor_faculties.json',
  classes: '7_classes.json',
  labels: '8_labels.json',
  reviews: '9_reviews.json',
  reviewLabels: '10_review_labels.json',
  reviewVotes: '11_review_votes.json',
  universityDomains: '12_university_domains.json',
  reviewReactions: '13_review_reactions.json',
  
  // PascalCase/Singular accessor (AcadTerm)
  acadTerm: '14_acad_terms.json',

  // CamelCase accessors
  classTiming: '15_class_timings.json',
  classExamTiming: '16_class_exam_timings.json',
  classAvailability: '17_class_availability.json',
  bidWindow: '18_bid_window.json',
  bidResult: '19_bid_result.json',
  hackSubmission: '20_hack_submissions.json',
};

async function main() {
  console.log('Starting ordered data export...');

  try {
    // 1. Ensure the output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`Output directory created/verified: ${OUTPUT_DIR}`);

    // 2. Iterate over the ordered mapping
    const modelKeys = Object.keys(EXPORT_MAPPING) as ModelKey[];

    for (const modelName of modelKeys) {
      const targetFilename = EXPORT_MAPPING[modelName];

      // Type assertion: We tell TypeScript that this dynamic access yields an object 
      // with a findMany method, which is true for all generated Prisma models.
      const model = prisma[modelName] as any;

      if (model && typeof model.findMany === 'function') {
        try {
          // Pull ALL data from the table
          const data = await model.findMany({});

          // Determine the full output path
          const outputPath = path.join(OUTPUT_DIR, targetFilename);

          // Convert the data array to a pretty-printed JSON string
          const jsonString = JSON.stringify(data, null, 2);

          // Write the JSON string to the file
          await fs.writeFile(outputPath, jsonString, 'utf8');

          console.log(`Exported ${data.length} records from '${modelName}' to ${outputPath}`);
        } catch (error) {
          // Safely access error message in TypeScript
          const errorMessage = error instanceof Error ? error.message : 'Unknown error during export';
          console.error(`Failed to export data for model '${modelName}':`, errorMessage);
        }
      } else {
        console.warn(`Model '${modelName}' not found in Prisma Client or lacks 'findMany'. Skipping.`);
      }
    }

    console.log('\nAll ordered data export complete!');

  } catch (e) {
    console.error('An error occurred during the overall process:', e);
  } finally {
    // 3. Disconnect the Prisma client
    await prisma.$disconnect();
  }
}

main()
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
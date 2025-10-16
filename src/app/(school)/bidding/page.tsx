import { Separator } from "@/common/components/separator";
import { api } from "@/common/tools/trpc/server";
import { ClassCard } from "@/modules/bidding/components/ClassCard";
import { Combobox } from "@/modules/bidding/components/Combobox";
import { texts as originalTexts } from "@/modules/bidding/constants";
import { type UniversityAbbreviation } from "@prisma/client";

// Extended texts object to include placeholders/labels for the new time filters
const texts = {
  ...originalTexts,
  COMBOBOX: {
    ...originalTexts.COMBOBOX,
    PLACEHOLDER: {
      ...originalTexts.COMBOBOX.PLACEHOLDER,
      day: "Select Day",
      startsAfter: "Starts After...",
      endsBefore: "Ends Before...",
    },
    TRIGGER_LABEL: {
      ...originalTexts.COMBOBOX.TRIGGER_LABEL,
      day: "Day",
      startsAfter: "Starts After",
      endsBefore: "Ends Before",
    },
  },
};


// Define allowed days for the Day filter combobox items
const allowedDays = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;
type AllowedDay = typeof allowedDays[number];

// Define common time options for display in the Starts After / Ends Before Comboboxes
// The logic will now use the raw string from searchParams, but we need some options to display.
const TIME_OPTIONS = [
  "08:15", "11:30", "12:00", "15:15", "15:30", "18:45", "19:00", "22:00"
];


export default async function BiddingHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const school = "SMU" satisfies UniversityAbbreviation;
  const _searchParams = await searchParams;

  const courseCode = _searchParams.course;
  const profSlug = _searchParams.prof;

  // 1. Validate Day (Still necessary to validate against allowed days)
  const day = allowedDays.includes(_searchParams.day as AllowedDay)
    ? (_searchParams.day as AllowedDay)
    : undefined;

  // 2. Pass raw strings for Starts After and Ends Before (No validation/hardcoding)
  const startsAfter = _searchParams.startsAfter;
  const endsBefore = _searchParams.endsBefore;

  console.log("Search Params:", startsAfter, endsBefore);

  const hasSearchParams =
    !!courseCode || !!profSlug || !!day || !!startsAfter || !!endsBefore;

  const [courses, professors] = await Promise.all([
    api.courses.getAllByUniAbbrv({ universityAbbrv: school }),
    api.professors.getAllByUniAbbrv({ universityAbbrv: school }),
  ]);

  // Fetch classes, passing all filter parameters
  const classes = await api.classes.getAll({
    courseCode: courseCode,
    profSlug: profSlug,
    day: day,
    startsAfter: startsAfter, // Passed as raw string
    endsBefore: endsBefore,   // Passed as raw string
    limit: !hasSearchParams ? 6 : undefined,
  });

  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap">
        {/* Course Combobox (Existing) */}
        <Combobox
          items={courses.map((course) => ({
            value: course.code,
            label: `${course.code} ${course.name}`,
          }))}
          queryStringKey="course"
          selectedValue={courseCode}
          placeholder={texts.COMBOBOX.PLACEHOLDER.course}
          triggerLabel={texts.COMBOBOX.TRIGGER_LABEL.course}
        />

        {/* Professor Combobox (Existing) */}
        <Combobox
          items={professors.map((prof) => ({
            value: prof.slug,
            label: prof.name,
          }))}
          queryStringKey="prof"
          selectedValue={profSlug}
          placeholder={texts.COMBOBOX.PLACEHOLDER.professor}
          triggerLabel={texts.COMBOBOX.TRIGGER_LABEL.professor}
        />

        {/* Day Combobox (New) */}
        <Combobox
          items={allowedDays.map((d) => ({
            value: d,
            label: d,
          }))}
          queryStringKey="day"
          selectedValue={day}
          placeholder={texts.COMBOBOX.PLACEHOLDER.day}
          triggerLabel={texts.COMBOBOX.TRIGGER_LABEL.day}
        />

        {/* Starts After Combobox (New - Uses common time options) */}
        <Combobox
          items={TIME_OPTIONS.map((time) => ({
            value: time,
            label: time,
          }))}
          queryStringKey="startsAfter"
          selectedValue={startsAfter}
          placeholder={texts.COMBOBOX.PLACEHOLDER.startsAfter}
          triggerLabel={texts.COMBOBOX.TRIGGER_LABEL.startsAfter}
        />

        {/* Ends Before Combobox (New - Uses common time options) */}
        <Combobox
          items={TIME_OPTIONS.map((time) => ({
            value: time,
            label: time,
          }))}
          queryStringKey="endsBefore"
          selectedValue={endsBefore}
          placeholder={texts.COMBOBOX.PLACEHOLDER.endsBefore}
          triggerLabel={texts.COMBOBOX.TRIGGER_LABEL.endsBefore}
        />
      </div>
      <Separator />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {classes.length > 0 ? (
          classes.map((c) => (
            <ClassCard
              key={c.id}
              classId={c.id}
              course={c.course}
              section={c.section}
              classTiming={c.classTimings}
              examTiming={c.classExamTimings}
              professor={c.professor}
            />
          ))
        ) : (
          <div className="col-span-2 text-center text-gray-500">
            No classes found for the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}
"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/card";
import { SortableTable } from "@/common/components/sortable-table";
import { formatNumberShortScale } from "@/common/functions";
import { GraduationCapColoredIcon, ClockIcon } from "@/common/components/icons";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/select";

// Main type for a module's summary data
export type ModuleSummary = {
  instructor: string;
  day: string;
  time: string;
  vacancies: string;
  change: number;
  min: number;
  median: number;
  courseCode: string;
  section: string;
};

export const ModAlternativesCard = ({
  selectedModule,
  similarModules,
  onScopeChange,
}: {
  selectedModule: ModuleSummary;
  similarModules: ModuleSummary[];
  onScopeChange: (scope: string) => void;
}) => {
  const hasAlternatives = similarModules.length > 0;

  const instructorTableData = similarModules.filter(
    (mod) => mod.instructor === selectedModule.instructor
  );

  const timeTableData = similarModules.filter(
    (mod) => mod.day === selectedModule.day && mod.time === selectedModule.time
  );

  const instructorColumns = [
    { key: "courseCode" as const, title: "Course" }, // Moved to the first position
    { key: "section" as const, title: "Section" }, // Moved to the second position
    { key: "day" as const, title: "Day" },
    { key: "time" as const, title: "Time" },
    {
      key: "vacancies" as const,
      title: "Vacancies",
      render: (mod: ModuleSummary) => {
        const [filled, capacity] = mod.vacancies.split("/").map(Number);
        const formattedChange = mod.change > 0 ? `+${mod.change}` : mod.change.toString();
        const changeColor =
          mod.change > 0 ? "text-green-500" : mod.change < 0 ? "text-red-500" : "text-white";
        return (
          <span>
            {filled}/{capacity}{" "}
            <span className={changeColor}>({formattedChange})</span>
          </span>
        );
      },
    },
    {
      key: "min" as const,
      title: "Min",
      render: (mod: ModuleSummary) =>
        formatNumberShortScale(mod.min, { minimumFractionDigits: 2, decimals: 2 }),
    },
    {
      key: "median" as const,
      title: "Median",
      render: (mod: ModuleSummary) =>
        formatNumberShortScale(mod.median, { minimumFractionDigits: 2, decimals: 2 }),
    },
  ];

  const timeColumns = [
    { key: "courseCode" as const, title: "Course" }, // Moved to the first position
    { key: "section" as const, title: "Section" }, // Moved to the second position
    { key: "instructor" as const, title: "Instructor" },
    {
      key: "vacancies" as const,
      title: "Vacancies",
      render: (mod: ModuleSummary) => {
        const [filled, capacity] = mod.vacancies.split("/").map(Number);
        const formattedChange = mod.change > 0 ? `+${mod.change}` : mod.change.toString();
        const changeColor =
          mod.change > 0 ? "text-green-500" : mod.change < 0 ? "text-red-500" : "text-white";
        return (
          <span>
            {filled}/{capacity}{" "}
            <span className={changeColor}>({formattedChange})</span>
          </span>
        );
      },
    },
    {
      key: "min" as const,
      title: "Min",
      render: (mod: ModuleSummary) =>
        formatNumberShortScale(mod.min, { minimumFractionDigits: 2, decimals: 2 }),
    },
    {
      key: "median" as const,
      title: "Median",
      render: (mod: ModuleSummary) =>
        formatNumberShortScale(mod.median, { minimumFractionDigits: 2, decimals: 2 }),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Alternative classes for</CardTitle>
          <Select defaultValue="CS301" onValueChange={onScopeChange}>
            <SelectTrigger className="w-fit">
              <SelectValue placeholder="Select an alternative" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="CS301">this module</SelectItem>
                <SelectItem value="Solution Management">Solution Management basket</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-8">
        {!hasAlternatives ? (
          <div className="text-center text-muted-foreground">No alternatives found.</div>
        ) : (
          <>
            {instructorTableData.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <GraduationCapColoredIcon size={24} />
                  Instructor: {selectedModule.instructor ?? "N/A"}
                </div>
                <SortableTable data={instructorTableData} columns={instructorColumns} />
              </div>
            )}

            {timeTableData.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <ClockIcon size={24} />
                  Class Timing: {selectedModule.day} {selectedModule.time ?? "N/A"}
                </div>
                <SortableTable data={timeTableData} columns={timeColumns} />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
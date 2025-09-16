"use client";
import React, { useState, useMemo } from "react";
import { ModAlternativesCard, ModuleSummary } from "./ModAlternativesCard";

const initialSelectedModule: ModuleSummary = {
  instructor: "Tan XX",
  day: "Tue",
  time: "08:15-11:30",
  vacancies: "0/48",
  change: 0,
  min: 34.42,
  median: 34.48,
  courseCode: "CS301",
  section: "G1",
};

const allModules: ModuleSummary[] = [
  initialSelectedModule,
  {
    instructor: "Tan XX",
    day: "Mon",
    time: "14:00-17:30",
    vacancies: "5/48",
    change: 5,
    min: 25.0,
    median: 28.5,
    courseCode: "CS301",
    section: "G4",
  },
  {
    instructor: "James Wong",
    day: "Tue",
    time: "08:15-11:30",
    vacancies: "3/48",
    change: -3,
    min: 34.42,
    median: 34.48,
    courseCode: "CS301",
    section: "G3",
  },
  {
    instructor: "John Doe",
    day: "Fri",
    time: "10:00-12:00",
    vacancies: "10/60",
    change: 1,
    min: 20.0,
    median: 22.5,
    courseCode: "CS301",
    section: "G10",
  },
];

type ModAlternativesClientWrapperProps = Record<string, never>;

export function ModAlternativesClientWrapper({}: ModAlternativesClientWrapperProps) {
  const [scope, setScope] = useState("CS301");

  const handleScopeChange = (newScope: string) => {
    setScope(newScope);
  };

  const similarModules = useMemo(() => {
    if (scope === "CS301") {
      return allModules.filter((mod) => mod !== initialSelectedModule);
    }
    else if (scope === "Solution Management") {
        return [...allModules.filter((mod) => mod !== initialSelectedModule),
          {
            instructor: "New Person",
            day: "Tue",
            time: "08:15-11:30",
            vacancies: "15/45",
            change: -10,
            min: 30.0,
            median: 31.5,
            courseCode: "CS302",
            section: "G1" 
          },
        ];
    }
    return [];
  }, [scope]);

  return (
    <ModAlternativesCard
      selectedModule={initialSelectedModule}
      similarModules={similarModules}
      onScopeChange={handleScopeChange}
    />
  );
}
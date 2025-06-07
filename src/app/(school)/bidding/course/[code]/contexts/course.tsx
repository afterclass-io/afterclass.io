"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type class_t = {
  id: string;
  section: string;
  courseId: string;
  professorId: string;
  acadTermId: string;
  createdAt: Date;
  updatedAt: Date;
  gradingBasis: string;
  courseOutlineUrl: string;
  bossId: string;
};

interface CourseContextType {
  courseId: string;
  classes: class_t[];
  isLoading: boolean;
}

interface CourseProviderProps {
  children: ReactNode;
  intitialCourseCode: string;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

export const CourseProvider: React.FC<CourseProviderProps> = ({
  children,
  intitialCourseCode,
}) => {
  const [courseId, setCourseId] = useState<string>(intitialCourseCode);
  const [classes, setClasses] = useState<class_t[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchClasses = async () => {
      setIsLoading(true);
      try {
        const fetchedClasses = await mockApiCall;
        setClasses(fetchedClasses);
      } catch {
        console.error("failed to fetch classes");
      }
      setIsLoading(false);
    };

    void fetchClasses();
  }, [intitialCourseCode]);

  const contextValue: CourseContextType = {
    courseId,
    classes,
    isLoading,
  };

  return (
    <CourseContext.Provider value={contextValue}>
      {children}
    </CourseContext.Provider>
  );
};

export const useCourseContext = () => {
  const context = useContext(CourseContext);
  return context;
};

export const mockClasses: class_t[] = [
  {
    id: "cls_001",
    section: "A",
    courseId: "crs_cs101", // Assuming course IDs
    professorId: "prof_doe", // Assuming professor IDs
    acadTermId: "term_2024_1", // Assuming academic term IDs (e.g., 2024-2025 Term 1)
    createdAt: new Date("2024-08-15T10:00:00Z"),
    updatedAt: new Date("2024-08-15T10:00:00Z"),
    gradingBasis: "Standard",
    courseOutlineUrl: "https://example.edu/outlines/cs101-A-outline.pdf",
    bossId: "boss_coord_001", // Example: coordinator or department head ID
  },
  {
    id: "cls_002",
    section: "B",
    courseId: "crs_cs101",
    professorId: "prof_smith",
    acadTermId: "term_2024_1",
    createdAt: new Date("2024-08-15T10:05:00Z"),
    updatedAt: new Date("2024-08-15T10:05:00Z"),
    gradingBasis: "Standard",
    courseOutlineUrl: "https://example.edu/outlines/cs101-B-outline.pdf",
    bossId: "boss_coord_001",
  },
  {
    id: "cls_003",
    section: "C",
    courseId: "crs_ma201", // Calculus I
    professorId: "prof_jones",
    acadTermId: "term_2024_1",
    createdAt: new Date("2024-08-16T09:00:00Z"),
    updatedAt: new Date("2024-08-16T09:00:00Z"),
    gradingBasis: "Standard",
    courseOutlineUrl: "https://example.edu/outlines/ma201-C-outline.pdf",
    bossId: "boss_coord_002",
  },
  {
    id: "cls_004",
    section: "D",
    courseId: "crs_en100", // English Composition
    professorId: "prof_brown",
    acadTermId: "term_2024_1",
    createdAt: new Date("2024-08-16T11:30:00Z"),
    updatedAt: new Date("2024-08-16T11:30:00Z"),
    gradingBasis: "Pass/Fail", // Example of different grading basis
    courseOutlineUrl: "https://example.edu/outlines/en100-D-outline.pdf",
    bossId: "boss_coord_003",
  },
  {
    id: "cls_005",
    section: "E",
    courseId: "crs_phl101", // Introduction to Philosophy
    professorId: "prof_davis",
    acadTermId: "term_2024_1",
    createdAt: new Date("2024-08-17T14:00:00Z"),
    updatedAt: new Date("2024-08-17T14:00:00Z"),
    gradingBasis: "Standard",
    courseOutlineUrl: "https://example.edu/outlines/phl101-E-outline.pdf",
    bossId: "boss_coord_004",
  },
  {
    id: "cls_006",
    section: "F",
    courseId: "crs_cs305", // Data Structures & Algorithms (advanced course)
    professorId: "prof_jones", // Professor Jones teaching another course
    acadTermId: "term_2024_1",
    createdAt: new Date("2024-08-18T08:00:00Z"),
    updatedAt: new Date("2024-08-18T08:00:00Z"),
    gradingBasis: "Standard",
    courseOutlineUrl: "https://example.edu/outlines/cs305-F-outline.pdf",
    bossId: "boss_coord_001",
  },
  {
    id: "cls_007",
    section: "G",
    courseId: "crs_mu100", // Music Appreciation
    professorId: "prof_williams",
    acadTermId: "term_2024_2", // Different academic term
    createdAt: new Date("2024-12-01T09:30:00Z"),
    updatedAt: new Date("2024-12-01T09:30:00Z"),
    gradingBasis: "Standard",
    courseOutlineUrl: "https://example.edu/outlines/mu100-G-outline.pdf",
    bossId: "boss_coord_005",
  },
];

const mockApiCall = new Promise<class_t[]>((resolve, reject) => {
  setTimeout(() => {
    resolve(mockClasses);
  });
});

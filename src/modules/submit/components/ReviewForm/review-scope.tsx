"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * The review form stores database ids, but the catalog search scopes by
 * course code and professor slug. This context carries the code and slug of
 * each section's current pick so the other section can narrow its list.
 */
type ReviewScope = {
  courseCode: string | undefined;
  professorSlug: string | undefined;
  setCourseCode: (code: string | undefined) => void;
  setProfessorSlug: (slug: string | undefined) => void;
};

const ReviewScopeContext = createContext<ReviewScope | null>(null);

export function ReviewScopeProvider({ children }: { children: ReactNode }) {
  const [courseCode, setCourseCode] = useState<string | undefined>();
  const [professorSlug, setProfessorSlug] = useState<string | undefined>();

  const value = useMemo(
    () => ({ courseCode, professorSlug, setCourseCode, setProfessorSlug }),
    [courseCode, professorSlug],
  );

  return (
    <ReviewScopeContext.Provider value={value}>
      {children}
    </ReviewScopeContext.Provider>
  );
}

/** Returns null outside a provider: a lone section then searches unscoped. */
export function useReviewScope(): ReviewScope | null {
  return useContext(ReviewScopeContext);
}

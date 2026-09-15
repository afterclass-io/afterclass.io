type CourseFigures = {
  course: { name: string; code: string };
  averageRating: number;
  reviewCount: number;
  reviewLabels: { name: string; count: number }[];
  professorCount: number;
};

type ProfessorFigures = {
  professor: { name: string };
  averageRating: number;
  reviewCount: number;
  reviewLabels: { name: string; count: number }[];
  courseCount: number;
};

/** The most-cited label, if any label was cited at all. */
function topLabelNote(reviewLabels: { name: string; count: number }[]): string {
  const topLabel = [...reviewLabels].sort((a, b) => b.count - a.count)[0];
  return topLabel && topLabel.count > 0
    ? ` Most-cited label: ${topLabel.name}.`
    : "";
}

/** Description composed from this course's own figures, distinct per URL. */
export function courseDescription(data: CourseFigures): string {
  const { course, averageRating, reviewCount, reviewLabels, professorCount } =
    data;
  const professors = `${professorCount} professor${professorCount === 1 ? "" : "s"}`;
  if (reviewCount === 0) {
    return `${course.name} (${course.code}): no student reviews yet; taught by ${professors}.`;
  }

  return `${course.name} (${course.code}): ${reviewCount} student reviews with a ${averageRating.toFixed(2)}/5 average rating across ${professors}.${topLabelNote(reviewLabels)}`;
}

/** Description composed from this professor's own figures, distinct per URL. */
export function professorDescription(data: ProfessorFigures): string {
  const { professor, averageRating, reviewCount, reviewLabels, courseCount } =
    data;
  const courses = `${courseCount} course${courseCount === 1 ? "" : "s"}`;
  if (reviewCount === 0) {
    return `${professor.name}: no student reviews yet; teaches ${courses}.`;
  }

  return `${professor.name}: ${reviewCount} student reviews with a ${averageRating.toFixed(2)}/5 average rating across ${courses}.${topLabelNote(reviewLabels)}`;
}

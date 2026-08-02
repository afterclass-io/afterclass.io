/**
 * Pure helpers mapping between roadmap term codes and AcadTerm codes/labels.
 *
 * Roadmaps use T1/T2/T3A/T3B; AcadTerms use T1/T2/T3 with labels like
 * "AY2025/26 T1". T3A and T3B both map onto the T3 acad term.
 *
 * All functions are pure — no side effects, no dependencies beyond stdlib.
 */

/**
 * Map a roadmap term code to an AcadTerm term code.
 * T3A and T3B both map to the T3 acad term.
 */
export function mapRoadmapTermToAcadCode(roadmapTerm: string): string {
  if (roadmapTerm === "T3A" || roadmapTerm === "T3B") return "T3";
  return roadmapTerm;
}

/**
 * Extract the term code from an AcadTerm label like "AY2024/25 T1".
 * Returns e.g. "T1", or null when the label has no term suffix.
 */
export function extractAcadTermCode(label: string): string | null {
  const match = /T(\d+[A-Za-z]?)/.exec(label);
  return match ? `T${match[1]}` : null;
}

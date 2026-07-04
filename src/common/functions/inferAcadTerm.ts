export type AcadTerm = {
  acadYear: string;
  term: string;
  displayYear: string;
  shortLabel: string; // "21-22 T1", "22-23 T2", "25-26 T3B", etc.
};

export function inferAcadTerm(acadTermId: string): AcadTerm {
  const [acadYear, term] = acadTermId.split("T");
  const displayYear = acadYear!.slice(2, 6) + "-" + acadYear!.slice(6, 8);
  const shortLabel = `${acadYear!.slice(4, 6)}-${acadYear!.slice(6, 8)} T${term}`;
  return {
    acadYear: acadYear!,
    term: term!,
    displayYear,
    shortLabel,
  };
}

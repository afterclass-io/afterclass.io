export type AcadTerm = {
  acadYear: string;
  term: string;
  displayYear: string;
};

export function inferAcadTerm(acadTermId: string): AcadTerm {
  const [acadYear, term] = acadTermId.split("T");
  const displayYear = acadYear!.slice(2, 6) + "-" + acadYear!.slice(6, 8);
  return {
    acadYear: acadYear!,
    term: term!,
    displayYear,
  };
}

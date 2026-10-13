import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  getAll: vi.fn(),
  getByCourseCode: vi.fn(),
  getBySlug: vi.fn(),
}));

vi.mock("@/common/tools/trpc/server", () => ({
  api: {
    classes: { getAll: m.getAll },
    courses: { getByCourseCode: m.getByCourseCode },
    professors: { getBySlug: m.getBySlug },
  },
}));

vi.mock("@/modules/bidding/components/CourseProfessorFilter", () => ({
  CourseProfessorFilter: (props: {
    selectedCourse: { label: string } | null;
    selectedProfessor: { label: string } | null;
  }) => (
    <div
      data-stub="filter"
      data-course={props.selectedCourse?.label ?? ""}
      data-professor={props.selectedProfessor?.label ?? ""}
    />
  ),
}));

vi.mock("@/modules/bidding/components/BiddingClassList", () => ({
  BiddingClassList: (props: { initialClasses: Record<string, unknown>[] }) => (
    <ul
      data-stub="classes"
      data-keys={Object.keys(props.initialClasses[0] ?? {}).join(",")}
    >
      {props.initialClasses.map((c) => (
        <li key={String(c.id)}>{String(c.id)}</li>
      ))}
    </ul>
  ),
}));

import BiddingHistoryPage from "./page";

const rawClass = {
  id: "cls-1",
  section: "S1",
  course: { code: "CS101", name: "Intro" },
  classTimings: [],
  classExamTimings: [],
  professor: { id: "p1", name: "Prof A", slug: "prof-a" },
  notForwarded: "dropped by the page mapping",
};

describe("Bidding page entry state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.getAll.mockResolvedValue([rawClass]);
    m.getByCourseCode.mockResolvedValue({ code: "CS101", name: "Intro" });
    m.getBySlug.mockResolvedValue({ slug: "prof-a", name: "Prof A" });
  });

  it("renders the class list with no course or professor selected", async () => {
    const jsx = await BiddingHistoryPage({
      searchParams: Promise.resolve({}),
    });
    const markup = renderToStaticMarkup(jsx);

    expect(m.getAll).toHaveBeenCalledWith({
      courseCode: undefined,
      profSlug: undefined,
    });
    expect(m.getByCourseCode).not.toHaveBeenCalled();
    expect(m.getBySlug).not.toHaveBeenCalled();
    expect(markup).toContain('class="flex flex-col gap-6 pt-2"');
    expect(markup).toContain('data-course=""');
    expect(markup).toContain('data-professor=""');
    expect(markup).toContain(
      'data-keys="id,section,course,classTimings,classExamTimings,professor"',
    );
    expect(markup).toContain(">cls-1</li>");
  });

  it("resolves the course and professor from search params", async () => {
    const jsx = await BiddingHistoryPage({
      searchParams: Promise.resolve({ course: "CS101", prof: "prof-a" }),
    });
    const markup = renderToStaticMarkup(jsx);

    expect(m.getAll).toHaveBeenCalledWith({
      courseCode: "CS101",
      profSlug: "prof-a",
    });
    expect(m.getByCourseCode).toHaveBeenCalledWith({ code: "CS101" });
    expect(m.getBySlug).toHaveBeenCalledWith({ slug: "prof-a" });
    expect(markup).toContain('data-course="CS101 Intro"');
    expect(markup).toContain('data-professor="Prof A"');
  });
});

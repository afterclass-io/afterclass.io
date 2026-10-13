"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Combobox, type ComboboxOption } from "@/common/components/combobox";
import { useSearchCatalog } from "@/common/hooks/useSearchCatalog";
import { texts } from "@/modules/bidding/constants";

type Props = {
  selectedCourse: ComboboxOption | null;
  selectedProfessor: ComboboxOption | null;
};

export function CourseProfessorFilter({
  selectedCourse,
  selectedProfessor,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [courseQuery, setCourseQuery] = useState("");
  const [profQuery, setProfQuery] = useState("");

  const courseCatalog = useSearchCatalog({
    entity: "course",
    query: courseQuery,
    scope: selectedProfessor?.value
      ? { professorSlug: selectedProfessor.value }
      : undefined,
  });

  const profCatalog = useSearchCatalog({
    entity: "professor",
    query: profQuery,
    scope: selectedCourse?.value
      ? { courseCode: selectedCourse.value }
      : undefined,
  });

  const updateSearchParam = (key: "course" | "prof", value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const queryString = params.toString();
    router.push(pathname + (queryString ? `?${queryString}` : ""));
  };

  const courseOptions: ComboboxOption[] = courseCatalog.rows.map((course) => ({
    value: course.code,
    label: `${course.code} ${course.name}`,
  }));

  const profOptions: ComboboxOption[] = profCatalog.rows.map((prof) => ({
    value: prof.slug,
    label: prof.name,
  }));

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Combobox
        options={courseOptions}
        total={courseCatalog.total}
        value={selectedCourse}
        onValueChange={(next) =>
          updateSearchParam("course", next?.value ?? null)
        }
        query={courseQuery}
        onQueryChange={setCourseQuery}
        isFetching={courseCatalog.isFetching}
        isStale={courseCatalog.isStale}
        idle={courseCatalog.isIdle}
        hintText={texts.COMBOBOX.HINT.course}
        placeholder={texts.COMBOBOX.PLACEHOLDER.course}
        triggerLabel={texts.COMBOBOX.TRIGGER_LABEL.course}
        className="w-64 max-w-full"
      />
      <Combobox
        options={profOptions}
        total={profCatalog.total}
        value={selectedProfessor}
        onValueChange={(next) => updateSearchParam("prof", next?.value ?? null)}
        query={profQuery}
        onQueryChange={setProfQuery}
        isFetching={profCatalog.isFetching}
        isStale={profCatalog.isStale}
        idle={profCatalog.isIdle}
        hintText={texts.COMBOBOX.HINT.professor}
        placeholder={texts.COMBOBOX.PLACEHOLDER.professor}
        triggerLabel={texts.COMBOBOX.TRIGGER_LABEL.professor}
        className="w-64 max-w-full"
      />
    </div>
  );
}

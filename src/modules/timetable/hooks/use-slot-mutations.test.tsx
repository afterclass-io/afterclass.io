// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ArrangedClass } from "@/common/types/timetable";
import { activeTimetableIdAtom } from "@/modules/timetable/atoms/timetable";

import {
  useAddSlotMutation,
  useRemoveSlotMutation,
  useSetSlotSectionMutation,
  type SectionOption,
} from "./use-slot-mutations";

type Callbacks = {
  onMutate: (vars: unknown) => Promise<{ prev?: unknown }>;
  onError: (
    error: { message: string },
    vars: unknown,
    context: { prev?: unknown } | undefined,
  ) => void;
  onSettled: () => void;
  onSuccess: (data: unknown, vars: unknown) => void;
};

type Arrangement = { slots: ArrangedClass[] };
type ArrangementUpdater = (
  old: Arrangement | undefined,
) => Arrangement | undefined;

const mocks = vi.hoisted(() => ({
  cancel: vi.fn<(input: { timetableId: string }) => Promise<void>>(),
  getData: vi.fn<(input: { timetableId: string }) => Arrangement | undefined>(),
  setData:
    vi.fn<
      (
        input: { timetableId: string },
        updater: (old: Arrangement | undefined) => Arrangement | undefined,
      ) => void
    >(),
  invalidate: vi.fn<(input: { timetableId: string }) => Promise<void>>(),
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
  captured: new Map<string, Callbacks>(),
}));

vi.mock("@/common/tools/trpc/react", () => {
  const capture = (name: string) => ({
    useMutation: (options: Callbacks) => {
      mocks.captured.set(name, options);
      return { mutate: vi.fn() };
    },
  });
  return {
    api: {
      useUtils: () => ({
        timetable: {
          getArrangement: {
            cancel: mocks.cancel,
            getData: mocks.getData,
            setData: mocks.setData,
            invalidate: mocks.invalidate,
          },
        },
      }),
      timetable: {
        removeSlot: capture("removeSlot"),
        addSlot: capture("addSlot"),
        setSlotSection: capture("setSlotSection"),
      },
    },
  };
});

vi.mock("sonner", () => ({ toast: mocks.toast }));

const TT = "tt1";

const existing: ArrangedClass = {
  classId: "c1",
  courseCode: "IS111",
  courseName: "Intro to Systems",
  section: "G1",
  professorName: "Prof A",
  creditUnits: 3,
  timings: [
    { dayOfWeek: "MON", startTime: "08:30", endTime: "10:00", venue: "SOE" },
  ],
  examTimings: [],
};

const other: ArrangedClass = {
  classId: "c9",
  courseCode: "IS216",
  courseName: "Web Apps",
  section: "G2",
  professorName: null,
  creditUnits: 3,
  timings: [
    { dayOfWeek: "WED", startTime: "13:00", endTime: "14:30", venue: null },
  ],
  examTimings: [],
};

const picked: SectionOption = {
  classId: "c2",
  section: "T2",
  professorName: "Prof B",
  courseCode: "IS111",
  courseName: "Intro to Systems",
  creditUnits: 3,
  timings: [
    { dayOfWeek: "TUE", startTime: "09:00", endTime: "10:30", venue: "B1" },
  ],
};

function renderSlotHook(hook: () => unknown, timetableId: string | null = TT) {
  const store = createStore();
  store.set(activeTimetableIdAtom, timetableId);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  renderHook(hook, { wrapper });
}

function callbacksFor(name: string): Callbacks {
  const callbacks = mocks.captured.get(name);
  if (!callbacks) throw new Error(`${name} mutation was not rendered`);
  return callbacks;
}

function lastSetDataUpdater(): ArrangementUpdater {
  const call = mocks.setData.mock.calls.at(-1);
  if (!call) throw new Error("setData was not called");
  return call[1];
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cancel.mockResolvedValue(undefined);
  mocks.invalidate.mockResolvedValue(undefined);
  mocks.getData.mockReturnValue({ slots: [existing, other] });
});

describe("useRemoveSlotMutation", () => {
  it("cancels, snapshots, then drops the class optimistically", async () => {
    renderSlotHook(() => useRemoveSlotMutation());
    const context = await callbacksFor("removeSlot").onMutate({
      timetableId: TT,
      classId: "c1",
    });

    expect(mocks.cancel).toHaveBeenCalledWith({ timetableId: TT });
    expect(mocks.cancel.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.getData.mock.invocationCallOrder[0] ?? Infinity,
    );
    expect(mocks.getData).toHaveBeenCalledWith({ timetableId: TT });
    expect(context).toEqual({ prev: [existing, other] });
    expect(mocks.setData).toHaveBeenCalledWith(
      { timetableId: TT },
      expect.any(Function),
    );
    expect(lastSetDataUpdater()({ slots: [existing, other] })).toEqual({
      slots: [other],
    });
  });

  it("restores the snapshot and toasts the message on error", async () => {
    renderSlotHook(() => useRemoveSlotMutation());
    const callbacks = callbacksFor("removeSlot");
    const context = await callbacks.onMutate({
      timetableId: TT,
      classId: "c1",
    });
    callbacks.onError(
      { message: "boom" },
      { timetableId: TT, classId: "c1" },
      context,
    );

    expect(lastSetDataUpdater()({ slots: [other] })).toEqual({
      slots: [existing, other],
    });
    expect(mocks.toast.error).toHaveBeenCalledWith(
      "Failed to remove class: boom",
    );
  });

  it("refetches the arrangement on settle and toasts success", () => {
    renderSlotHook(() => useRemoveSlotMutation());
    const callbacks = callbacksFor("removeSlot");
    callbacks.onSettled();
    callbacks.onSuccess(undefined, { timetableId: TT, classId: "c1" });

    expect(mocks.invalidate).toHaveBeenCalledWith({ timetableId: TT });
    expect(mocks.toast.success).toHaveBeenCalledWith(
      "Removed class from timetable",
    );
  });

  it("uses an empty timetable id and skips the snapshot read when none is active", async () => {
    renderSlotHook(() => useRemoveSlotMutation(), null);
    const context = await callbacksFor("removeSlot").onMutate({
      timetableId: TT,
      classId: "c1",
    });

    expect(mocks.cancel).toHaveBeenCalledWith({ timetableId: "" });
    expect(mocks.getData).not.toHaveBeenCalled();
    expect(context).toEqual({ prev: undefined });
  });
});

describe("useAddSlotMutation", () => {
  it("cancels, snapshots, then appends the picked section optimistically", async () => {
    renderSlotHook(() =>
      useAddSlotMutation({ sections: [picked], courseCode: "IS111" }),
    );
    const context = await callbacksFor("addSlot").onMutate({
      timetableId: TT,
      classId: "c2",
    });

    expect(mocks.cancel).toHaveBeenCalledWith({ timetableId: TT });
    expect(context).toEqual({ prev: [existing, other] });
    expect(lastSetDataUpdater()({ slots: [existing] })).toEqual({
      slots: [
        existing,
        {
          classId: "c2",
          courseCode: "IS111",
          courseName: "Intro to Systems",
          section: "T2",
          professorName: "Prof B",
          creditUnits: 3,
          timings: [
            {
              dayOfWeek: "TUE",
              startTime: "09:00",
              endTime: "10:30",
              venue: "B1",
            },
          ],
          examTimings: [],
        },
      ],
    });
  });

  it("skips the optimistic write when the class is not among the sections", async () => {
    renderSlotHook(() => useAddSlotMutation({ sections: [picked] }));
    await callbacksFor("addSlot").onMutate({
      timetableId: TT,
      classId: "unknown",
    });

    expect(mocks.cancel).toHaveBeenCalledWith({ timetableId: TT });
    expect(mocks.setData).not.toHaveBeenCalled();
  });

  it("toasts created and already-present outcomes, then calls onDone", () => {
    const onDone = vi.fn();
    renderSlotHook(() => useAddSlotMutation({ courseCode: "IS111", onDone }));
    const callbacks = callbacksFor("addSlot");
    const vars = { timetableId: TT, classId: "c2" };
    callbacks.onSuccess({ created: true }, vars);
    callbacks.onSuccess({ created: false }, vars);

    expect(mocks.toast.success).toHaveBeenCalledWith(
      "Added IS111 to timetable",
    );
    expect(mocks.toast.info).toHaveBeenCalledWith(
      "IS111 is already in your timetable",
    );
    expect(onDone).toHaveBeenCalledTimes(2);
  });

  it("refetches the arrangement on settle", () => {
    renderSlotHook(() => useAddSlotMutation());
    callbacksFor("addSlot").onSettled();

    expect(mocks.invalidate).toHaveBeenCalledWith({ timetableId: TT });
  });

  it("uses generic error copy without a course code and course copy with one", () => {
    const vars = { timetableId: TT, classId: "c2" };

    renderSlotHook(() => useAddSlotMutation());
    callbacksFor("addSlot").onError({ message: "boom" }, vars, undefined);
    expect(mocks.toast.error).toHaveBeenLastCalledWith(
      "Failed to add class. Please try again.",
    );

    renderSlotHook(() => useAddSlotMutation({ courseCode: "IS111" }));
    callbacksFor("addSlot").onError({ message: "boom" }, vars, undefined);
    expect(mocks.toast.error).toHaveBeenLastCalledWith(
      "Failed to add IS111. Please try again.",
    );
  });
});

describe("useSetSlotSectionMutation", () => {
  it("cancels, snapshots, then replaces every slot of the same course optimistically", async () => {
    renderSlotHook(() =>
      useSetSlotSectionMutation({ sections: [picked], courseCode: "IS111" }),
    );
    const context = await callbacksFor("setSlotSection").onMutate({
      timetableId: TT,
      courseId: "course-1",
      classId: "c2",
    });

    expect(mocks.cancel).toHaveBeenCalledWith({ timetableId: TT });
    expect(context).toEqual({ prev: [existing, other] });
    const updated = lastSetDataUpdater()({ slots: [existing, other] });
    expect(updated?.slots.map((s) => s.classId)).toEqual(["c9", "c2"]);
  });

  it("refetches the arrangement on settle and toasts the swap outcome", () => {
    renderSlotHook(() => useSetSlotSectionMutation({ courseCode: "IS111" }));
    const callbacks = callbacksFor("setSlotSection");
    const vars = { timetableId: TT, courseId: "course-1", classId: "c2" };
    callbacks.onSettled();
    callbacks.onSuccess(undefined, vars);

    expect(mocks.invalidate).toHaveBeenCalledWith({ timetableId: TT });
    expect(mocks.toast.success).toHaveBeenCalledWith(
      "Swapped section for IS111",
    );
  });

  it("restores the snapshot and toasts the swap error", async () => {
    renderSlotHook(() => useSetSlotSectionMutation());
    const callbacks = callbacksFor("setSlotSection");
    const vars = { timetableId: TT, courseId: "course-1", classId: "c2" };
    const context = await callbacks.onMutate(vars);
    callbacks.onError({ message: "boom" }, vars, context);

    expect(lastSetDataUpdater()({ slots: [other] })).toEqual({
      slots: [existing, other],
    });
    expect(mocks.toast.error).toHaveBeenCalledWith(
      "Failed to swap section. Please try again.",
    );
  });
});

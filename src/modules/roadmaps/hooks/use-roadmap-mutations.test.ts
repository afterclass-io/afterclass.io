// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useRoadmapMutations } from "./use-roadmap-mutations";

type RoadmapRow = {
  id: string;
  matricTermId: string | null;
  facultyId: number | null;
};

type ListUpdate =
  | RoadmapRow[]
  | undefined
  | ((old: RoadmapRow[] | undefined) => RoadmapRow[] | undefined);

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

const mocks = vi.hoisted(() => ({
  listMine: {
    cancel: vi.fn<() => Promise<void>>(),
    getData: vi.fn<() => RoadmapRow[] | undefined>(),
    setData: vi.fn<(input: undefined, value: unknown) => void>(),
    invalidate: vi.fn<() => Promise<void>>(),
  },
  getMine: { invalidate: vi.fn<() => Promise<void>>() },
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
        roadmaps: { listMine: mocks.listMine, getMine: mocks.getMine },
      }),
      roadmaps: {
        create: capture("create"),
        rename: capture("rename"),
        remove: capture("remove"),
        saveEntries: capture("saveEntries"),
        setActive: capture("setActive"),
        setMatricTerm: capture("setMatricTerm"),
        syncProgress: capture("syncProgress"),
        setFaculty: capture("setFaculty"),
      },
    },
  };
});

vi.mock("sonner", () => ({ toast: mocks.toast }));

const rows: RoadmapRow[] = [
  { id: "r1", matricTermId: null, facultyId: null },
  { id: "r2", matricTermId: "t1", facultyId: 4 },
];

function renderRoadmapHook() {
  return renderHook(() =>
    useRoadmapMutations({
      selectedId: "r1",
      setSelectedId: vi.fn(),
      setMutating: vi.fn(),
    }),
  );
}

function callbacksFor(name: string): Callbacks {
  const callbacks = mocks.captured.get(name);
  if (!callbacks) throw new Error(`${name} mutation was not rendered`);
  return callbacks;
}

function lastListUpdate(): ListUpdate {
  const call = mocks.listMine.setData.mock.calls.at(-1);
  if (!call) throw new Error("listMine.setData was not called");
  return call[1] as ListUpdate;
}

function applyLastUpdate(old: RoadmapRow[] | undefined) {
  const update = lastListUpdate();
  if (typeof update !== "function") {
    throw new Error("expected an updater function");
  }
  return update(old);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listMine.cancel.mockResolvedValue(undefined);
  mocks.listMine.invalidate.mockResolvedValue(undefined);
  mocks.getMine.invalidate.mockResolvedValue(undefined);
  mocks.listMine.getData.mockReturnValue(rows);
});

describe("setMatricTermMutation", () => {
  it("cancels, snapshots, then sets the term on the matching roadmap", async () => {
    renderRoadmapHook();
    const context = await callbacksFor("setMatricTerm").onMutate({
      roadmapId: "r1",
      matricTermId: "t2",
    });

    expect(mocks.listMine.cancel).toHaveBeenCalledWith();
    expect(mocks.listMine.getData).toHaveBeenCalledWith();
    expect(context).toEqual({ prev: rows });
    expect(mocks.listMine.setData).toHaveBeenCalledWith(
      undefined,
      expect.any(Function),
    );
    expect(applyLastUpdate(rows)).toEqual([
      { id: "r1", matricTermId: "t2", facultyId: null },
      { id: "r2", matricTermId: "t1", facultyId: 4 },
    ]);
  });

  it("restores the snapshot and toasts the message on error", async () => {
    renderRoadmapHook();
    const callbacks = callbacksFor("setMatricTerm");
    const context = await callbacks.onMutate({
      roadmapId: "r1",
      matricTermId: "t2",
    });
    callbacks.onError(
      { message: "boom" },
      { roadmapId: "r1", matricTermId: "t2" },
      context,
    );

    expect(mocks.listMine.setData).toHaveBeenLastCalledWith(undefined, rows);
    expect(mocks.toast.error).toHaveBeenCalledWith(
      "Failed to save matriculation year: boom",
    );
  });

  it("invalidates listMine and getMine on settle", async () => {
    renderRoadmapHook();
    callbacksFor("setMatricTerm").onSettled();

    await vi.waitFor(() => {
      expect(mocks.listMine.invalidate).toHaveBeenCalledWith();
      expect(mocks.getMine.invalidate).toHaveBeenCalledWith();
    });
  });

  it("toasts success with the sync hint", () => {
    renderRoadmapHook();
    callbacksFor("setMatricTerm").onSuccess(undefined, {
      roadmapId: "r1",
      matricTermId: "t2",
    });

    expect(mocks.toast.success).toHaveBeenCalledWith(
      "Matriculation year saved",
      expect.objectContaining({
        description: expect.stringContaining(
          "Existing modules keep their placement",
        ) as unknown,
      }),
    );
  });
});

describe("setFacultyMutation", () => {
  it("cancels, snapshots, then sets the faculty on the matching roadmap", async () => {
    renderRoadmapHook();
    const context = await callbacksFor("setFaculty").onMutate({
      roadmapId: "r2",
      facultyId: 7,
    });

    expect(mocks.listMine.cancel).toHaveBeenCalledWith();
    expect(mocks.listMine.getData).toHaveBeenCalledWith();
    expect(context).toEqual({ prev: rows });
    expect(applyLastUpdate(rows)).toEqual([
      { id: "r1", matricTermId: null, facultyId: null },
      { id: "r2", matricTermId: "t1", facultyId: 7 },
    ]);
  });

  it("restores the snapshot and toasts the message on error", async () => {
    renderRoadmapHook();
    const callbacks = callbacksFor("setFaculty");
    const context = await callbacks.onMutate({ roadmapId: "r2", facultyId: 7 });
    callbacks.onError(
      { message: "boom" },
      { roadmapId: "r2", facultyId: 7 },
      context,
    );

    expect(mocks.listMine.setData).toHaveBeenLastCalledWith(undefined, rows);
    expect(mocks.toast.error).toHaveBeenCalledWith(
      "Failed to save faculty: boom",
    );
  });

  it("invalidates listMine and getMine on settle and toasts success", async () => {
    renderRoadmapHook();
    const callbacks = callbacksFor("setFaculty");
    callbacks.onSettled();
    callbacks.onSuccess(undefined, { roadmapId: "r2", facultyId: 7 });

    await vi.waitFor(() => {
      expect(mocks.listMine.invalidate).toHaveBeenCalledWith();
      expect(mocks.getMine.invalidate).toHaveBeenCalledWith();
    });
    expect(mocks.toast.success).toHaveBeenCalledWith(
      "Faculty saved for this roadmap",
    );
  });
});

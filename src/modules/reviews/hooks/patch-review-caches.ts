import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { api, getQueryClient } from "@/common/tools/trpc/react";
import type { Review } from "@/modules/reviews/types";

export type Snapshot = Array<[QueryKey, unknown]>;

type UtilsWithQueryClient = ReturnType<typeof api.useUtils> & {
  queryClient?: QueryClient;
};

type InfiniteReviewPages = {
  pages?: Array<{ items?: Review[]; nextCursor?: string }>;
  pageParams?: unknown[];
};

function resolveQueryClient(
  utils: ReturnType<typeof api.useUtils>,
): QueryClient | undefined {
  const qc = (utils as UtilsWithQueryClient).queryClient;
  if (qc && typeof qc.setQueriesData === "function") {
    return qc;
  }
  if (typeof window !== "undefined") {
    return getQueryClient();
  }
  return undefined;
}

export function getReviewCachesSnapshot(
  utils: ReturnType<typeof api.useUtils>,
): Snapshot {
  const queryClient = resolveQueryClient(utils);
  if (!queryClient || !api.reviews) return [];

  const infiniteKeys = [
    getQueryKey(api.reviews.getAllProtected),
    getQueryKey(api.reviews.getByCourseCodeProtected),
    getQueryKey(api.reviews.getByProfSlugProtected),
  ];
  const byIdKey = getQueryKey(api.reviews.getById);

  const snapshot: Snapshot = [];
  for (const queryKey of infiniteKeys) {
    snapshot.push(...queryClient.getQueriesData({ queryKey }));
  }
  snapshot.push(...queryClient.getQueriesData({ queryKey: byIdKey }));
  return snapshot;
}

export function restoreReviewCaches(
  utils: ReturnType<typeof api.useUtils>,
  snapshot?: Snapshot,
): void {
  const queryClient = resolveQueryClient(utils);
  if (!snapshot || !queryClient) return;
  for (const [queryKey, data] of snapshot) {
    queryClient.setQueryData(queryKey, data);
  }
}

export async function cancelReviewCaches(
  utils: ReturnType<typeof api.useUtils>,
): Promise<void> {
  const queryClient = resolveQueryClient(utils);
  if (!queryClient || !api.reviews) return;
  const procs = [
    api.reviews.getAllProtected,
    api.reviews.getByCourseCodeProtected,
    api.reviews.getByProfSlugProtected,
    api.reviews.getById,
  ];
  await Promise.all(
    procs.map((proc) =>
      queryClient.cancelQueries({ queryKey: getQueryKey(proc) }),
    ),
  );
}

export function patchReviewInCaches(
  utils: ReturnType<typeof api.useUtils>,
  reviewId: string,
  update: (r: Review) => Review,
): Snapshot {
  const queryClient = resolveQueryClient(utils);
  if (!queryClient || !api.reviews) return [];

  const snapshot = getReviewCachesSnapshot(utils);

  const infiniteKeys = [
    getQueryKey(api.reviews.getAllProtected),
    getQueryKey(api.reviews.getByCourseCodeProtected),
    getQueryKey(api.reviews.getByProfSlugProtected),
  ];
  const byIdKey = getQueryKey(api.reviews.getById);

  for (const queryKey of infiniteKeys) {
    queryClient.setQueriesData<InfiniteReviewPages>({ queryKey }, (oldData) => {
      if (!oldData || !Array.isArray(oldData.pages)) return oldData;
      let changed = false;
      const pages = oldData.pages.map((page) => {
        if (!page || !Array.isArray(page.items)) return page;
        let pageChanged = false;
        const items = page.items.map((item) => {
          if (item?.id === reviewId) {
            pageChanged = true;
            changed = true;
            return update(item);
          }
          return item;
        });
        return pageChanged ? { ...page, items } : page;
      });
      return changed ? { ...oldData, pages } : oldData;
    });
  }

  queryClient.setQueriesData<Review | undefined>(
    { queryKey: byIdKey },
    (oldReview) => {
      if (oldReview?.id !== reviewId) return oldReview;
      return update(oldReview);
    },
  );

  return snapshot;
}

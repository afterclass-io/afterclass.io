import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { api, getQueryClient } from "@/common/tools/trpc/react";
import type { Review } from "@/common/types/reviews";

export type Snapshot = Array<[QueryKey, unknown]>;

type InfiniteReviewPages = {
  pages?: Array<{ items?: Review[]; nextCursor?: string }>;
  pageParams?: unknown[];
};

/**
 * The tRPC utils proxy has no `queryClient` member: reading one returns a
 * callable proxy, never the client. These helpers run only in event handlers
 * and mutation callbacks, so they read the browser singleton the provider uses.
 */
function resolveQueryClient(): QueryClient | undefined {
  return typeof window !== "undefined" ? getQueryClient() : undefined;
}

export function getReviewCachesSnapshot(): Snapshot {
  const queryClient = resolveQueryClient();
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

export function restoreReviewCaches(snapshot?: Snapshot): void {
  const queryClient = resolveQueryClient();
  if (!snapshot || !queryClient) return;
  for (const [queryKey, data] of snapshot) {
    queryClient.setQueryData(queryKey, data);
  }
}

export async function cancelReviewCaches(): Promise<void> {
  const queryClient = resolveQueryClient();
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
  reviewId: string,
  update: (r: Review) => Review,
): Snapshot {
  const queryClient = resolveQueryClient();
  if (!queryClient || !api.reviews) return [];

  const snapshot = getReviewCachesSnapshot();

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

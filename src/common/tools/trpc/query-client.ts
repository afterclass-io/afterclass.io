import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

const NON_RETRYABLE_TRPC_CODES = new Set([
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "BAD_REQUEST",
]);

// Retrying a deterministic 4xx (e.g. an anonymous caller hitting a gated
// `dataProcedure`) only delays the error by the 1s+2s+4s backoff while
// loading UIs stay in their skeleton state. Transient failures still retry.
export function shouldRetryQuery(failureCount: number, error: unknown) {
  const code = (error as { data?: { code?: string } } | null)?.data?.code;
  if (code && NON_RETRYABLE_TRPC_CODES.has(code)) return false;
  return failureCount < 3;
}

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
        // Every focus refetch of a stale query is a /api/trpc function
        // invocation on Vercel. Mutations invalidate what they change, so
        // queries that must follow outside changes opt back in per query.
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });

import { useCallback, useMemo } from "react";

import { debounce } from "@/common/functions/debounce";

const DEFAULT_DELAY_MS = 300;

/**
 * Debounce harness shared by the optimistic reaction hooks.
 *
 * Every call runs `applyOptimistic` at once, so the UI answers without
 * delay. The server `mutate` call waits until calls stop for `delayMs`,
 * and only the last variables are sent. The cache shapes stay in the
 * callers: this hook knows nothing about them.
 */
export function useDebouncedOptimisticMutate<TVariables>(
  mutate: (variables: TVariables) => void,
  applyOptimistic: (variables: TVariables) => void,
  delayMs: number = DEFAULT_DELAY_MS,
): (variables: TVariables) => void {
  const debouncedMutate = useMemo(
    () => debounce((variables: TVariables) => mutate(variables), delayMs),
    [mutate, delayMs],
  );

  return useCallback(
    (variables: TVariables) => {
      applyOptimistic(variables); // immediate UI update
      debouncedMutate(variables); // debounced server mutation
    },
    [applyOptimistic, debouncedMutate],
  );
}

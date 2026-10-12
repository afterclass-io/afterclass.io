export const MIN_QUERY_LEN = 2;
export const SEARCH_DEBOUNCE_MS = 300;
export const SHORT_QUERY_HINT = `Type ${MIN_QUERY_LEN} or more characters.`;

/** True when the trimmed text is too short for the server to search. */
export const isShortQuery = (q: string) => q.trim().length < MIN_QUERY_LEN;

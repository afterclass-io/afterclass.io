// Deterministic widths for `SidebarMenuSkeleton`. A cycling table keyed by item
// index keeps the varied appearance the old random value was there for, while
// producing identical markup on the server and client (no hydration mismatch).
const SKELETON_WIDTHS = ["55%", "70%", "85%", "62%", "78%"] as const;

export function sidebarMenuSkeletonWidth(index = 0) {
  return SKELETON_WIDTHS[index % SKELETON_WIDTHS.length]!;
}

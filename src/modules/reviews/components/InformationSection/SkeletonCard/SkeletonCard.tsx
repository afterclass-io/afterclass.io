import { type ReactNode } from "react";

// The card surface shared by the information skeletons. Keep it in step with
// the real cards so the layout does not shift when the data arrives.
export const SkeletonCard = ({ children }: { children: ReactNode }) => (
  <div className="bg-card flex h-full w-full flex-col gap-3 rounded-2xl p-4 text-base md:gap-5 md:p-6">
    {children}
  </div>
);

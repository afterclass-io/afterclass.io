import { cn } from "@/common/functions";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "bg-accent animate-pulse rounded-md text-transparent select-none",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };

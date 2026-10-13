import { cn } from "@/common/functions";

type SkeletonProps = React.ComponentProps<"div"> & {
  /**
   * Shows the shimmer when true and the children when false. Only matters when
   * the skeleton wraps children.
   */
  loading?: boolean;
};

/**
 * A shimmering placeholder.
 *
 * Without children it is a box that the caller sizes with classes. With
 * children it wraps the real content: while `loading` is true the content stays
 * in the layout but is hidden, so the shimmer takes the size of the content it
 * replaces and follows later changes to that content. The root is also
 * `aria-hidden`: `*:invisible` does not hide bare text nodes, so assistive
 * technology would otherwise read placeholder text as real content.
 */
function Skeleton({
  className,
  children,
  loading = true,
  ...props
}: SkeletonProps) {
  if (!loading) {
    return <>{children}</>;
  }

  return (
    <div
      data-slot="skeleton"
      aria-busy="true"
      aria-hidden="true"
      className={cn(
        "bg-accent animate-pulse rounded-md text-transparent select-none *:invisible",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Skeleton };

/** Clickable class cell: opens the class-info modal for the row's class. */
export function ClassInfoButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  /** Full text, shown on hover when the cell truncates it. */
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="hover:text-primary block max-w-full cursor-pointer truncate text-left hover:underline"
    >
      {children}
    </button>
  );
}

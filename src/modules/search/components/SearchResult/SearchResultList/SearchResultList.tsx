export const SearchResultList = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="flex w-full flex-col items-start gap-4">{children}</div>
  );
};

/** A titled section of a policy page (terms, privacy, guidelines). */
export function PolicySection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="text-muted-foreground mt-2 space-y-2 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  );
}

import { Separator } from "@/common/components/separator";
import { cn } from "@/common/functions";

export const SearchResultEmpty = ({ show = false }: { show: boolean }) => {
  return (
    <div
      className={cn(
        "bg-card md:px16 flex w-full flex-col items-center gap-4 rounded-lg p-4 py-8 text-sm md:p-8",
        !show && "hidden",
      )}
      data-test="search-empty"
    >
      <div className="text-xl">No results found.</div>
      <Separator />
      <div className="text-muted-foreground w-full">
        <strong className="text-muted-foreground">💡 Tip!</strong> You can
        search for a course’s name, course code, or professor’s name.
        <br />
        <br />
        (e.g.)
        <br />
        <em>Course - </em>
        <strong className="text-muted-foreground">Big Questions</strong>
        <br />
        <em>Course Code - </em>
        <strong className="text-muted-foreground">COR-COMM1202</strong>
        <br />
        <em>Professor - </em>
        <strong className="text-muted-foreground">
          Chiraphol New Chiyachantana
        </strong>
      </div>
    </div>
  );
};

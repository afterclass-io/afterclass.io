import { InformationCard } from "@/modules/reviews/components/InformationSection/InformationCard";
import { DetailCard } from "@/modules/reviews/components/InformationSection/DetailCard";

export default function Loading() {
  return (
    <div className="grid w-full grid-cols-25 gap-4 md:gap-6">
      <div className="col-span-25 md:col-span-16">
        <InformationCard.Skeleton />
      </div>
      <div className="col-span-25 md:col-span-9">
        <DetailCard.Skeleton />
      </div>
    </div>
  );
}

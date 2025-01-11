import { ReviewSection } from "@/modules/reviews/components/ReviewSection";
import { ReviewItemLoader } from "@/modules/reviews/components/ReviewItemLoader";
import { ReviewModalFocused } from "@/modules/reviews/components/ReviewModalFocused";

export default function Home() {
  return (
    <>
      <ReviewSection>
        <ReviewItemLoader variant="home" />
      </ReviewSection>
      <ReviewModalFocused variant="home" />
    </>
  );
}

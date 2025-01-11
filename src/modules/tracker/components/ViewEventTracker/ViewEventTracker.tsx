import { InView } from "react-intersection-observer";

export const ViewEventTracker = ({
  onChange,
}: {
  onChange: (inView: boolean, entry: IntersectionObserverEntry) => void;
}) => {
  return <InView as="div" className="sr-only" onChange={onChange} />;
};

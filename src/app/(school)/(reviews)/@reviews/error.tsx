"use client"; // Error boundaries must be Client Components

import {
  SegmentError,
  type SegmentErrorProps,
} from "@/common/components/segment-error";

export default function Error(props: SegmentErrorProps) {
  return <SegmentError {...props} />;
}

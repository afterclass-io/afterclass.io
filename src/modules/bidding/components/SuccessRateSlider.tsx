"use client";
import { type ComponentProps } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

export const SuccessRateSlider = (props: ComponentProps<typeof Slider>) => {
  return (
    <div className="p-6 pt-2">
      <Slider
        min={50}
        max={95}
        defaultValue={70}
        marks={{
          50: "50%",
          60: "60%",
          70: "70%",
          80: "80%",
          90: "90%",
          95: "95%",
        }}
        step={null}
        styles={{
          track: { backgroundColor: "var(--primary)", height: 5 },
          handle: {
            borderColor: "var(--secondary)",
            height: 16,
            width: 16,
            backgroundColor: "var(--primary)",
          },
          rail: {
            backgroundColor: "var(--muted-foreground)",
            height: 5,
          },
        }}
        {...props}
      />
    </div>
  );
};

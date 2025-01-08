import { type VariantProps, tv } from "tailwind-variants";

export type ChartVariants = VariantProps<typeof chartTheme>;

export const chartTheme = tv(
  {
    slots: {
      container: [
        "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
      ],
      tooltipLabel: ["font-medium"],
      tooltipContent: [
        "border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl",
      ],
      tooltipContentItem: [
        "[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5",
      ],
      tooltipContentIndicator: [
        "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
      ],
      tooltipContentLabelContainer: [
        "flex flex-1 justify-between leading-none items-center",
      ],
      tooltipContentLabelName: ["grid gap-1.5"],
      tooltipContentLabelValue: [
        "text-foreground font-mono font-medium tabular-nums",
      ],
      legendContent: ["flex items-center justify-center gap-4"],
    },
    variants: {
      indicator: {
        line: {
          tooltipContentIndicator: ["w-1"],
        },
        dot: {
          tooltipContent: ["items-center"],
          tooltipContentIndicator: ["h-2.5 w-2.5"],
        },
        dashed: {
          tooltipContentIndicator: [
            "w-0 border-[1.5px] border-dashed bg-transparent",
          ],
        },
      },
      nestLabel: {
        true: {
          tooltipContentLabelContainer: ["items-end"],
        },
        false: {},
      },
      verticalAlign: {
        top: {
          legendContent: ["pb-3"],
        },
        bottom: {
          legendContent: ["pt-3"],
        },
        middle: {
          legendContent: ["pt-3"],
        },
      },
    },
    compoundVariants: [
      {
        nestLabel: true,
        indicator: "dashed",
        className: "my-0.5",
      },
    ],
  },
  { responsiveVariants: true },
);

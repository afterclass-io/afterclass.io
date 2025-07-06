/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/common/components/chart";

export const description = "A bar chart with a label";

const chartConfig = {
  price: {
    label: "price",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export const BidChart = ({
  chartData,
}: {
  chartData: {
    // in the format "AY202526T1/1/1" <- academic year, round, window
    bidWindow: string;
    price: [number, number]; // [min, median]
    size: number; // number of successful bids
  }[];
}) => {
  return (
    <ChartContainer config={chartConfig}>
      <BarChart
        accessibilityLayer
        data={chartData}
        margin={{
          top: 20,
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="bidWindow"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => {
            const acadTerm = value.split("/")[0];
            const [acadYear, term] = acadTerm.split("T");
            const displayYear =
              acadYear.slice(2, 6) + "-" + acadYear.slice(6, 8);
            return `${displayYear} T${term}`;
          }}
        />
        <YAxis axisLine={false} tickLine={false} />
        <Bar
          dataKey="price"
          fill="var(--color-price)"
          minPointSize={6}
          radius={4}
        >
          {chartData.length < 12 ? (
            <>
              <LabelList
                position="top"
                offset={12}
                className="fill-foreground"
                fontSize={12}
                // @ts-expect-error we are certain value refers to `price
                valueAccessor={(d) => d.price[1]}
              />
              <LabelList
                position="bottom"
                offset={12}
                className="fill-foreground"
                fontSize={12}
                // @ts-expect-error we are certain value refers to `price
                valueAccessor={(d) => d.price[0]}
              />
            </>
          ) : null}
        </Bar>

        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) => {
                const [acadTerm, round, window] = value.split("/");
                const [acadYear, term] = acadTerm.split("T");
                const displayYear =
                  acadYear.slice(2, 6) + "-" + acadYear.slice(6, 8);
                return (
                  <div className="flex flex-col">
                    <span>
                      {displayYear} Term {term}
                    </span>
                    <span className="text-muted-foreground -mt-2 space-x-1.5">
                      <span className="text-xs">Round {round}</span>
                      <span className="text-xs">Window {window}</span>
                    </span>
                  </div>
                );
              }}
              formatter={(value, _, item) => (
                <div className="text-muted-foreground min-w-[180px] items-center text-xs">
                  <div className="flex justify-between">
                    median
                    <div className="text-foreground ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums">
                      <span className="text-muted-foreground font-normal">
                        e$
                      </span>
                      {/* @ts-expect-error we are certain value refers to `price` */}
                      {value[1]}
                    </div>
                  </div>

                  <div className="flex">
                    min
                    <div className="text-foreground ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums">
                      <span className="text-muted-foreground font-normal">
                        e$
                      </span>
                      {/* @ts-expect-error we are certain value refers to `price` */}
                      {value[0]}
                    </div>
                  </div>

                  <div className="flex">
                    seats taken
                    <div className="text-foreground ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums">
                      {item.payload.size}
                    </div>
                  </div>
                </div>
              )}
            />
          }
          cursor={false}
          defaultIndex={1}
        />
      </BarChart>
    </ChartContainer>
  );
};

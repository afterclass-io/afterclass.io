"use client";

import { useId } from "react";
import { Info } from "lucide-react";
import type { Control } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/common/components/form";
import { Label } from "@/common/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/tooltip";
import type { CreatePollFormValues } from "@/modules/meetings/functions/build-create-poll-payload";
import { formatHourLabel } from "@/modules/meetings/functions/format-meeting";

const START_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const END_HOURS = Array.from({ length: 24 }, (_, hour) => hour + 1);

type HourSelectProps = {
  control: Control<CreatePollFormValues>;
  name: "startHour" | "endHour";
  hours: number[];
  label: string;
  testId: string;
};

function HourSelect({ control, name, hours, label, testId }: HourSelectProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="min-w-0 flex-1 gap-1 md:gap-1">
          <Select
            value={String(field.value)}
            onValueChange={(value) => field.onChange(Number(value))}
          >
            <FormControl>
              <SelectTrigger
                className="w-full"
                aria-label={label}
                data-test={testId}
              >
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent className="max-h-56">
              {hours.map((hour) => (
                <SelectItem key={hour} value={String(hour)}>
                  {formatHourLabel(hour)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** Earliest and latest hour of each day that participants can mark availability for. */
export function TimeWindowFields({
  control,
}: {
  control: Control<CreatePollFormValues>;
}) {
  const labelId = useId();

  return (
    <div role="group" aria-labelledby={labelId} className="grid gap-1.5">
      <Label id={labelId} className="gap-1.5">
        Daily hours
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="About daily hours"
              className="text-muted-foreground"
            >
              <Info className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            Participants mark availability in 15-minute blocks within these
            hours (Singapore time).
          </TooltipContent>
        </Tooltip>
      </Label>
      <div className="flex items-start gap-2">
        <HourSelect
          control={control}
          name="startHour"
          hours={START_HOURS}
          label="Earliest hour"
          testId="start-hour-select"
        />
        <span className="text-muted-foreground pt-2 text-sm">to</span>
        <HourSelect
          control={control}
          name="endHour"
          hours={END_HOURS}
          label="Latest hour"
          testId="end-hour-select"
        />
      </div>
    </div>
  );
}

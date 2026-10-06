"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarX, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/common/components/button";
import { Card, CardContent } from "@/common/components/card";
import { DateRangePicker } from "@/common/components/date-range-picker";
import { EmptyState } from "@/common/components/empty-state";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/common/components/form";
import { Input } from "@/common/components/input";
import { Label } from "@/common/components/label";
import { PageTitle } from "@/common/components/page-title";
import { Textarea } from "@/common/components/textarea";
import {
  countDaysInclusive,
  defaultRangeInTerm,
  isWithinTerm,
  termDateWindow,
  todayIsoSGT,
  type TermWindow,
} from "@/common/functions/term-date-bounds";
import { api } from "@/common/tools/trpc/react";
import {
  ClassPicker,
  type ClassOption,
} from "@/modules/meetings/components/create/ClassPicker";
import { TimeWindowFields } from "@/modules/meetings/components/create/TimeWindowFields";
import {
  buildCreatePollPayload,
  type CreatePollFormValues,
} from "@/modules/meetings/functions/build-create-poll-payload";
import { MeetingLinksField } from "@/modules/meetings/components/shared/MeetingLinksField";
import {
  DEFAULT_POLL_DAYS,
  MAX_AGENDA_LENGTH,
  MAX_POLL_DAYS,
  POLL_DAY_PRESETS,
} from "@/modules/meetings/functions/meeting-limits";
import { meetingLinksSchema } from "@/modules/meetings/functions/meeting-links";

const FIELD = "max-w-none gap-1.5 md:gap-1.5";

function createPollSchema(term: TermWindow) {
  return z
    .object({
      title: z
        .string()
        .min(1, "Title is required")
        .max(120, "Title cannot exceed 120 characters"),
      agenda: z
        .string()
        .max(MAX_AGENDA_LENGTH, `Agenda cannot exceed ${MAX_AGENDA_LENGTH} characters`)
        .optional(),
      links: meetingLinksSchema.optional(),
      startDate: z.iso.date(),
      endDate: z.iso.date(),
      startHour: z.number().int().min(0).max(23),
      endHour: z.number().int().min(1).max(24),
      courseId: z.string().optional(),
      section: z.string().max(10).optional(),
      teamIdentifier: z
        .string()
        .max(50, "Team cannot exceed 50 characters")
        .optional(),
    })
    .refine((data) => data.startDate <= data.endDate, {
      message: "Start date must be before or equal to end date",
      path: ["endDate"],
    })
    .refine(
      (data) =>
        countDaysInclusive({ start: data.startDate, end: data.endDate }) <=
        MAX_POLL_DAYS,
      {
        message: `Date range cannot exceed ${MAX_POLL_DAYS} days`,
        path: ["endDate"],
      },
    )
    .refine(
      (data) =>
        isWithinTerm({ start: data.startDate, end: data.endDate }, term),
      { message: "Dates must fall within the current term", path: ["endDate"] },
    )
    .refine((data) => data.startHour < data.endHour, {
      message: "Start hour must be earlier than end hour",
      path: ["endHour"],
    });
}

type CreatePollFormBodyProps = {
  term: { id: string; label: string; startDt: Date; endDt: Date };
  classes: ClassOption[];
};

function CreatePollFormBody({ term, classes }: CreatePollFormBodyProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const termWindow = useMemo(() => termDateWindow(term), [term]);
  const schema = useMemo(() => createPollSchema(term), [term]);

  const defaultRange = useMemo(
    () => defaultRangeInTerm(todayIsoSGT(), term, DEFAULT_POLL_DAYS),
    [term],
  );

  const form = useForm<CreatePollFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      agenda: "",
      links: [],
      startDate: defaultRange.start,
      endDate: defaultRange.end,
      startHour: 8,
      endHour: 22,
      courseId: "",
      section: "",
      teamIdentifier: "",
    },
  });

  const [startDate, endDate, courseId, section] = useWatch({
    control: form.control,
    name: ["startDate", "endDate", "courseId", "section"],
  });

  const createPollMutation = api.meetings.createPoll.useMutation({
    onSuccess: async (data) => {
      toast.success("Meeting created");
      await utils.meetings.listMyMeetings.invalidate();
      router.push(`/meetings/${data.slug}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create meeting");
    },
  });

  return (
    <Card className="gap-0 py-4">
      <CardContent className="px-4 sm:px-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              createPollMutation.mutate(buildCreatePollPayload(values)),
            )}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className={FIELD}>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. IS215 Sprint 2 sync"
                      maxLength={120}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agenda"
              render={({ field }) => (
                <FormItem className={FIELD}>
                  <FormLabel>
                    Agenda{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What this meeting is for"
                      maxLength={MAX_AGENDA_LENGTH}
                      rows={2}
                      className="min-h-0 resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="links"
              render={({ field }) => (
                <FormItem className={FIELD}>
                  <FormLabel>
                    Links{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <MeetingLinksField
                      value={field.value ?? []}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid content-start gap-1.5">
                <Label htmlFor="poll-dates">Dates</Label>
                <DateRangePicker
                  id="poll-dates"
                  value={{ start: startDate, end: endDate }}
                  onChange={(range) => {
                    form.setValue("startDate", range.start, {
                      shouldValidate: true,
                    });
                    form.setValue("endDate", range.end, {
                      shouldValidate: true,
                    });
                  }}
                  min={termWindow.start}
                  max={termWindow.end}
                  maxDays={MAX_POLL_DAYS}
                  presets={POLL_DAY_PRESETS}
                />
                {form.formState.errors.endDate && (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.endDate.message}
                  </p>
                )}
              </div>

              <TimeWindowFields control={form.control} />
            </div>

            <fieldset className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
              <legend className="text-muted-foreground px-1 text-xs font-medium">
                Class (optional) · {term.label}
              </legend>
              <div className="grid min-w-0 content-start gap-1.5">
                <Label htmlFor="poll-class">Class</Label>
                <ClassPicker
                  id="poll-class"
                  classes={classes}
                  value={
                    courseId && section ? { courseId, section } : null
                  }
                  onChange={(selection) => {
                    form.setValue("courseId", selection?.courseId ?? "");
                    form.setValue("section", selection?.section ?? "");
                  }}
                />
              </div>

              <FormField
                control={form.control}
                name="teamIdentifier"
                render={({ field }) => (
                  <FormItem className={FIELD}>
                    <FormLabel>Team</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Team 4"
                        maxLength={50}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            <div className="flex flex-col-reverse items-center justify-end gap-2 sm:flex-row">
              <Button variant="ghost" asChild className="w-full sm:w-auto">
                <Link href="/meetings">Cancel</Link>
              </Button>
              <Button
                type="submit"
                disabled={createPollMutation.isPending}
                className="w-full gap-2 sm:w-auto"
                data-test="create-poll-submit-button"
              >
                {createPollMutation.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Create meeting
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export function CreatePollForm() {
  const { data: session, status: sessionStatus } = useSession();

  const { data: options, isLoading } = api.meetings.getCreateOptions.useQuery(
    undefined,
    { enabled: Boolean(session?.user), staleTime: 5 * 60 * 1000 },
  );

  if (sessionStatus !== "loading" && !session) {
    return (
      <div className="py-8">
        <EmptyState
          icon={<Users className="size-8" />}
          title="Sign in required"
          description="You need to sign in with your university account to create a meeting."
          action={
            <Button asChild>
              <Link
                href={`/account/auth/login?callbackUrl=${encodeURIComponent("/meetings/new")}`}
              >
                Sign In
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <PageTitle className="text-left text-2xl font-bold tracking-tight md:text-2xl!">
          New Meeting
        </PageTitle>
        <p className="text-muted-foreground text-sm">
          Pick dates and hours, then share the link so everyone can mark when
          they are free.
        </p>
      </div>

      {isLoading || !options ? (
        <div className="bg-card/50 h-80 animate-pulse rounded-xl border" />
      ) : options.term ? (
        <CreatePollFormBody term={options.term} classes={options.classes} />
      ) : (
        <EmptyState
          icon={<CalendarX className="size-8" />}
          title="No academic term available"
          description="Meetings are scheduled within the current term, and none is set up yet."
        />
      )}
    </div>
  );
}

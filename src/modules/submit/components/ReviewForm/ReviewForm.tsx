"use client";

import { startTransition, useEffect, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitHandler, useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

import {
  type ReviewFormInputsSchema,
  reviewFormSchema,
} from "@/common/tools/zod/schemas";
import { api } from "@/common/tools/trpc/react";
import { Form } from "@/common/components/form";
import { ReviewableEnum } from "@/modules/submit/types";
import { reviewFormTheme } from "./ReviewForm.theme";
import { SubmitButtonGroup } from "../SubmitButtonGroup";
import { useProgress } from "@/common/providers/ProgressProvider";

export const ReviewForm = ({ children }: { children: ReactNode }) => {
  const formMethods = useForm<ReviewFormInputsSchema>({
    resolver: zodResolver(reviewFormSchema),
    mode: "onTouched",
    defaultValues: {
      type: ReviewableEnum.PROFESSOR,
      course: {
        value: "",
        rating: 0,
        labels: [],
        body: "",
        tips: "",
      },
      professor: {
        value: "",
        rating: 0,
        labels: [],
        body: "",
        tips: "",
      },
    },
  });

  const { data: session, status } = useSession();
  const router = useRouter();
  const progress = useProgress();
  const [isLoading, setIsLoading] = useState(status === "loading");

  const reviewsMutation = api.reviews.create.useMutation();

  useEffect(() => {
    setIsLoading(status === "loading" || reviewsMutation.isPending);
  }, [status, reviewsMutation.isPending]);

  useEffect(() => {
    if (reviewsMutation.isSuccess) {
      // TODO: create and highlight reviews after navigating to the review page
      progress.start();
      startTransition(() => {
        router.push("/");
        progress.done();
      });
    }
    // router should not be a dependency here
    // https://stackoverflow.com/a/75008835
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewsMutation.isSuccess]);

  // uncomment this useEffect to see the form values in the console on change
  // useEffect(() => {
  //   const subscription = formMethods.watch((value, { name, type }) =>
  //     console.log(value, name, type),
  //   );
  //   return () => subscription.unsubscribe();
  // }, [formMethods.watch]);

  const onSubmit: SubmitHandler<ReviewFormInputsSchema> = (data) => {
    Sentry.addBreadcrumb({
      category: "review.submit",
      message:
        "Review Submitted." +
        `\n\tSession:\n${JSON.stringify(session)}\n` +
        `\n\tData:\n${JSON.stringify(data)}`,
      level: "info",
    });

    // TODO: populate user values from supabase when user is authenticated
    const userId = session?.user?.id ?? "85498973-b416-45d4-a3d1-fe8d7d2d5821";

    reviewsMutation.mutate({
      ...data,
      user: { id: userId },
    });
  };

  const { form: formTheme } = reviewFormTheme({
    size: { initial: "sm", md: "md" },
  });

  return (
    <Form {...formMethods}>
      <form
        className={formTheme()}
        onSubmit={formMethods.handleSubmit(onSubmit)}
      >
        {children}
        <SubmitButtonGroup isLoading={isLoading} />
      </form>
    </Form>
  );
};

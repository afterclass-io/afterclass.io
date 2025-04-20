"use client";
import * as React from "react";
import { usePathname } from "next/navigation";
import { api } from "@/common/tools/trpc/react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/common/components/breadcrumb";

interface BreadcrumbElement {
  label: string;
  href?: string;
}

const HOME_BREADCRUMB: BreadcrumbElement = {
  label: "Home",
  href: "/",
};

const getBreadcrumbElements = (
  pathSegments: string[],
): { elements: BreadcrumbElement[]; isSuccess: boolean } => {
  if (!pathSegments.length) {
    return { elements: [HOME_BREADCRUMB], isSuccess: true };
  }

  const elements = [HOME_BREADCRUMB];
  let isSuccess = false;

  switch (pathSegments[0]) {
    case "professor": {
      const query = api.professors.getBySlug.useQuery({
        slug: pathSegments[1] ?? "",
      });

      if (query.isSuccess && query.data) {
        elements.push({
          label: `Prof. ${query.data.name}`,
          href: `/professor/${query.data.slug}`,
        });
        isSuccess = true;
      }
      break;
    }

    case "course": {
      const query = api.courses.getByCourseCode.useQuery({
        code: pathSegments[1] ?? "",
      });

      if (query.isSuccess && query.data) {
        elements.push({
          label: `${query.data.code} ${query.data.name}`,
          href: `/course/${query.data.code}`,
        });
        isSuccess = true;
      }
      break;
    }

    case "submit": {
      elements.push({ label: "Write a Review" });
      isSuccess = true;
      break;
    }

    case "search": {
      elements.push({ label: "Search" });
      isSuccess = true;
      break;
    }
  }

  return { elements, isSuccess };
};

export const HomeBreadcrumb = (
  props: React.ComponentProps<typeof Breadcrumb>,
) => {
  const path = usePathname();
  const pathSegments = (path ?? "").split("/").filter(Boolean);
  const { elements, isSuccess } = getBreadcrumbElements(pathSegments);

  if (!isSuccess) {
    return (
      <Breadcrumb {...props}>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="max-w-80 truncate">
              {HOME_BREADCRUMB.label}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb {...props}>
      <BreadcrumbList>
        {elements.map((element, index) => (
          <React.Fragment key={element.label}>
            <BreadcrumbItem>
              {element.href && index < elements.length - 1 ? (
                <BreadcrumbLink
                  href={element.href}
                  className="max-w-80 truncate"
                >
                  {element.label}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="max-w-80 truncate">
                  {element.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {index < elements.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

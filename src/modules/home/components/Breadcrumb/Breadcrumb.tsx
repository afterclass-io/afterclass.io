"use client";
import * as React from "react";
import { usePathname } from "next/navigation";
import { api } from "@/common/tools/trpc/react";
import {
  Breadcrumb as BC,
  type BreadcrumbRootProps,
} from "@/common/components/Breadcrumb";

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

const BreadcrumbItem: React.FC<{
  element: BreadcrumbElement;
  isLast: boolean;
}> = ({ element, isLast }) => (
  <BC.Item>
    {element.href && !isLast ? (
      <BC.Link href={element.href} className="max-w-80 truncate">
        {element.label}
      </BC.Link>
    ) : (
      <BC.Page className="max-w-80 truncate">{element.label}</BC.Page>
    )}
  </BC.Item>
);

export const Breadcrumb: React.FC<BreadcrumbRootProps> = (props) => {
  const path = usePathname();
  const pathSegments = (path ?? "").split("/").filter(Boolean);
  const { elements, isSuccess } = getBreadcrumbElements(pathSegments);

  if (!isSuccess) {
    return (
      <BC {...props}>
        <BC.List>
          <BreadcrumbItem element={HOME_BREADCRUMB} isLast={true} />
        </BC.List>
      </BC>
    );
  }

  return (
    <BC {...props}>
      <BC.List>
        {elements.map((element, index) => (
          <React.Fragment key={element.label}>
            <BreadcrumbItem
              element={element}
              isLast={index === elements.length - 1}
            />
            {index < elements.length - 1 && <BC.Separator />}
          </React.Fragment>
        ))}
      </BC.List>
    </BC>
  );
};

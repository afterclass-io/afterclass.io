"use client";
import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
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

const BreadcrumbTrail = ({
  elements,
  ...props
}: React.ComponentProps<typeof Breadcrumb> & {
  elements: BreadcrumbElement[];
}) => (
  <Breadcrumb {...props}>
    <BreadcrumbList>
      {elements.map((element, index) => (
        <React.Fragment key={element.label}>
          <BreadcrumbItem>
            {element.href && index < elements.length - 1 ? (
              <BreadcrumbLink href={element.href} className="max-w-80 truncate">
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

/** Trail for /roadmaps, /roadmaps?view=mine and /roadmaps/[id]. */
const RoadmapsBreadcrumb = ({
  id,
  ...props
}: React.ComponentProps<typeof Breadcrumb> & { id?: string }) => {
  const searchParams = useSearchParams();
  // "mine" is the redirect route for the personal editor — never a roadmap id.
  // Only query the roadmap name on genuine public detail pages; the editor
  // trail shows "Personal" instead.
  const isMine = id === "mine" || searchParams.get("view") === "mine";
  const roadmapQuery = api.roadmaps.getById.useQuery(
    { id: id ?? "" },
    { enabled: !!id && !isMine, retry: false },
  );

  const elements: BreadcrumbElement[] = [
    HOME_BREADCRUMB,
    { label: "Roadmaps", href: "/roadmaps" },
  ];
  if (isMine) {
    elements.push({ label: "Personal" });
  } else if (id) {
    elements.push({ label: roadmapQuery.data?.roadmap.name ?? "Roadmap" });
  }

  return <BreadcrumbTrail elements={elements} {...props} />;
};

export const HomeBreadcrumb = (
  props: React.ComponentProps<typeof Breadcrumb>,
) => {
  const path = usePathname();
  const pathSegments = (path ?? "").split("/").filter(Boolean);

  // Hooks must be called unconditionally — always register both queries,
  // but only enable the one matching the current route.
  const profQuery = api.professors.getBySlug.useQuery(
    { slug: pathSegments[1] ?? "" },
    { enabled: pathSegments[0] === "professor" },
  );
  const courseQuery = api.courses.getByCourseCode.useQuery(
    { code: pathSegments[1] ?? "" },
    { enabled: pathSegments[0] === "course" },
  );

  const elements = [HOME_BREADCRUMB];
  let isSuccess = false;

  // /roadmaps needs search params + a slug lookup, so it lives in its own
  // Suspense-wrapped component (useSearchParams must sit inside Suspense).
  if (pathSegments[0] === "roadmaps") {
    return (
      <React.Suspense
        fallback={
          <BreadcrumbTrail
            elements={[HOME_BREADCRUMB, { label: "Roadmaps" }]}
            {...props}
          />
        }
      >
        <RoadmapsBreadcrumb id={pathSegments[1]} {...props} />
      </React.Suspense>
    );
  }

  switch (pathSegments[0]) {
    case "timetable": {
      elements.push({ label: "Timetable" });
      isSuccess = true;
      break;
    }

    case "professor": {
      if (profQuery.isSuccess && profQuery.data) {
        elements.push({
          label: `Prof. ${profQuery.data.name}`,
          href: `/professor/${profQuery.data.slug}`,
        });
        isSuccess = true;
      }
      break;
    }

    case "course": {
      if (courseQuery.isSuccess && courseQuery.data) {
        elements.push({
          label: `${courseQuery.data.code} ${courseQuery.data.name}`,
          href: `/course/${courseQuery.data.code}`,
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

    case "assistant": {
      elements.push({ label: "Assistant" });
      isSuccess = true;
      break;
    }

    case "mcp": {
      elements.push({ label: "MCP" });
      isSuccess = true;
      break;
    }

    case "bidding": {
      switch (pathSegments[1]) {
        case "history": {
          elements.push({ label: "Bid History" });
          isSuccess = true;
          break;
        }
        case "analytics": {
          elements.push({ label: "Bid Analytics" });
          isSuccess = true;
          break;
        }
        default: {
          elements.push({ label: "Bidding" });
          isSuccess = true;
          break;
        }
      }
      break;
    }
  }

  if (!isSuccess) {
    return (
      <Breadcrumb {...props}>
        <BreadcrumbList>
          <BreadcrumbItem>
            {path != "/" && (
              <BreadcrumbLink
                href={HOME_BREADCRUMB.href}
                className="max-w-80 truncate"
              >
                {HOME_BREADCRUMB.label}
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return <BreadcrumbTrail elements={elements} {...props} />;
};

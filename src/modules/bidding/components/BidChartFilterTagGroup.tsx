"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import { TagToggleGroup } from "@/common/components/tag-toggle-group";

export const BidChartFilterTagGroup = ({
  label,
  items,
}: {
  label: string;
  items: { label: string; value: string }[];
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedItems, setSelectedItems] = useState<string[]>(
    searchParams.getAll(label.toLowerCase()),
  );

  const createQueryString = useCallback(
    (name: string, values: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(name);
      values.forEach((value) => {
        params.append(name, value);
      });

      return params.toString();
    },
    [searchParams],
  );

  return (
    <div className="">
      <span>{label}:</span>
      <TagToggleGroup
        items={items}
        value={selectedItems}
        onChange={(values) => {
          const selectedItems = values as string[];
          setSelectedItems(selectedItems);
          router.push(
            `${pathname}?${createQueryString(label.toLowerCase(), selectedItems)}`,
            {
              scroll: false,
            },
          );
        }}
      />
    </div>
  );
};

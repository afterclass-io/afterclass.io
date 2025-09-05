"use client";
import * as React from "react";
import { cn } from "@/common/functions";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Column<T> {
  key: keyof T;
  title: string;
  render?: (row: T) => React.ReactNode;
}

interface SortableTableProps<T> {
  data: T[];
  columns: Column<T>[];
}

export function SortableTable<T extends Record<string, any>>({
  data,
  columns,
}: SortableTableProps<T>) {
  const [sortColumn, setSortColumn] = React.useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  const handleSort = (key: keyof T) => {
    if (sortColumn === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(key);
      setSortDirection("asc");
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortColumn) {
      return data;
    }

    const sorted = [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return sorted;
  }, [data, sortColumn, sortDirection]);

  return (
    <div className="relative w-full overflow-auto">
      <table className={cn("w-full caption-bottom text-sm")}>
        <thead className={cn("[&_tr]:border-b")}>
          <tr
            className={cn(
              "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
            )}
          >
            {columns.map((column) => (
              <th
                key={column.key as string}
                onClick={() => handleSort(column.key)}
                className={cn(
                  "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 cursor-pointer",
                )}
              >
                <div className="flex items-center gap-1">
                  {column.title}
                  {sortColumn === column.key && (
                    sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={cn("[&_tr:last-child]:border-0")}>
          {sortedData.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={cn(
                "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key as string}
                  className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0")}
                >
                  {column.render ? column.render(row) : String(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
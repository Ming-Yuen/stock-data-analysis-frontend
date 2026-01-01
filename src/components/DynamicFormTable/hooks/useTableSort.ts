import { useState } from "react";

export type SortDirection = "asc" | "desc";

export interface UseSortReturn {
  sortField: string | null;
  sortDirection: SortDirection;
  handleSort: (columnId: string, isSortable: boolean) => void;
  getSortedData: <T extends Record<string, any>>(data: T[]) => T[];
}

export const useTableSort = (): UseSortReturn => {
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (columnId: string, isSortable: boolean) => {
    if (!isSortable) return;

    if (sortField === columnId) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(columnId);
      setSortDirection("asc");
    }
  };

  const getSortedData = <T extends Record<string, any>>(data: T[]): T[] => {
    if (!sortField) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue);
      const bStr = String(bValue);
      const comparison = aStr.localeCompare(bStr, undefined, {
        numeric: true,
        sensitivity: "base",
      });

      return sortDirection === "asc" ? comparison : -comparison;
    });
  };

  return {
    sortField,
    sortDirection,
    handleSort,
    getSortedData,
  };
};

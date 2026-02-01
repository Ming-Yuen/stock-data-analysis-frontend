import React from "react";

export interface Column {
  id: string;
  label: string;
  type?: "text" | "number" | "select" | "date" | "datetime" | "checkbox";
  selectOptions?: { label: string; value: string | number }[];
  width?: number | string;
  render?: (value: any, row: any, index: number, extraProps?: any) => React.ReactNode;
  isActionColumn?: boolean;
  sortable?: boolean;
  sourceDateFormat?: string;
  displayDateFormat?: string;
  uppercase?: boolean;
  onChange?: (value: any, row: Record<string, any>) => void | Promise<void>;
}

export interface DynamicFormTableProps {
  columns: Column[];
  initialRows?: Record<string, any>[];
  onRowsChange?: (rows: Record<string, any>[]) => void;
  data?: Record<string, any>[];
  loading?: boolean;
  error?: Error | null;
  hasMore?: boolean;
  onLoadMore?: () => void;
  title?: string;
  maxHeight?: number | string;
  enableInfiniteScroll?: boolean;
  extraRenderProps?: any;
  pageKey: string;
  toolbarActions?: React.ReactNode;
  onSearch?: (criteria: Record<string, any>) => void;
}

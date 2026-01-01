import React from "react";
import {
  TableCell,
  TextField,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";
import { useDateFormatter } from "./hooks/useDateFormatter";
import { Column } from "./DynamicFormTable.types";

export interface TableDataCellProps {
  column: Column;
  row: Record<string, any>;
  rowIndex: number;
  isExternal: boolean;
  onChange?: (rowIndex: number, columnId: string, value: any) => void;
  extraRenderProps?: any;
}

export const TableDataCell: React.FC<TableDataCellProps> = ({
  column,
  row,
  rowIndex,
  isExternal,
  onChange,
  extraRenderProps,
}) => {
  const { formatDate } = useDateFormatter();

  if (column.render) {
    return (
      <TableCell>
        {column.render(row[column.id], row, rowIndex, extraRenderProps)}
      </TableCell>
    );
  }

  const value = row[column.id];

  if (isExternal) {
    if (column.type === "date") {
      const formatted = formatDate(
        value,
        column.sourceDateFormat,
        column.displayDateFormat
      );
      return (
        <TableCell>
          <Typography variant="body2">{formatted}</Typography>
        </TableCell>
      );
    }

    return (
      <TableCell>
        <Typography variant="body2">
          {value != null && value !== "" ? value : "-"}
        </Typography>
      </TableCell>
    );
  }

  if (column.type === "select") {
    return (
      <TableCell>
        <Select
          fullWidth
          size="small"
          value={row[column.id] ?? ""}
          onChange={(e) => onChange?.(rowIndex, column.id, e.target.value)}
        >
          {column.selectOptions?.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </TableCell>
    );
  }

  return (
    <TableCell>
      <TextField
        fullWidth
        size="small"
        type={column.type || "text"}
        value={row[column.id] ?? ""}
        onChange={(e) => onChange?.(rowIndex, column.id, e.target.value)}
        variant="outlined"
      />
    </TableCell>
  );
};

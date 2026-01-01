import React from "react";
import { TableCell, Box, Typography } from "@mui/material";
import { ArrowUpward, ArrowDownward } from "@mui/icons-material";
import { SortDirection } from "./hooks/useTableSort";
import { Column } from "./DynamicFormTable.types";

export interface TableHeaderCellProps {
  column: Column;
  isSorted: boolean;
  sortDirection: SortDirection;
  onSort: (columnId: string) => void;
}

export const TableHeaderCell: React.FC<TableHeaderCellProps> = ({
  column,
  isSorted,
  sortDirection,
  onSort,
}) => {
  const isSortable = !column.isActionColumn && column.sortable !== false;

  return (
    <TableCell
      key={column.id}
      sx={{
        width: column.width,
        fontWeight: "bold",
        backgroundColor: "primary.main",
        color: "primary.contrastText",
        cursor: isSortable ? "pointer" : "default",
        userSelect: "none",
        "&:hover": isSortable
          ? {
              backgroundColor: "primary.dark",
            }
          : {},
      }}
      onClick={() => isSortable && onSort(column.id)}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
        }}
      >
        <Typography variant="body2" component="span">
          {column.label}
        </Typography>
        {isSortable && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              ml: 0.5,
            }}
          >
            <ArrowUpward
              sx={{
                fontSize: 14,
                opacity: isSorted && sortDirection === "asc" ? 1 : 0.3,
              }}
            />
            <ArrowDownward
              sx={{
                fontSize: 14,
                marginTop: "-8px",
                opacity: isSorted && sortDirection === "desc" ? 1 : 0.3,
              }}
            />
          </Box>
        )}
      </Box>
    </TableCell>
  );
};

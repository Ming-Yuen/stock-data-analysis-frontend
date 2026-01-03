import React, { useState, useEffect } from "react";
import { TableContainer, Table, TableHead, TableBody, TableRow, Paper, Box, Alert } from "@mui/material";
import { useInfiniteScroll } from "./hooks/useInfiniteScroll";
import { useTableSort } from "./hooks/useTableSort";
import { DynamicFormTableProps } from "./DynamicFormTable.types";
import { TableDataCell } from "./TableDataCell";
import { TableHeaderCell } from "./TableHeaderCell";
import { TableFooter } from "./TableFooter";
import { apiConfig } from "../../apiConfig";
import { useMutate } from "../../hooks/api/useApi";
import { SearchCriteriaConfigResponse } from "../../services/types/dto/searchCriteria";

const DynamicFormTable: React.FC<DynamicFormTableProps> = ({ columns, initialRows = [], onRowsChange, data: externalData, loading = false, error = null, hasMore = false, onLoadMore, maxHeight, enableInfiniteScroll = true, extraRenderProps, pageKey }) => {
  const [rows, setRows] = useState<Record<string, any>[]>(initialRows);

  const useExternalData = externalData !== undefined;
  const currentData = useExternalData ? externalData : rows;
  const currentLoading = useExternalData ? loading : false;
  const currentError = useExternalData ? error : null;

  const { sortField, sortDirection, handleSort, getSortedData } = useTableSort();

  const { lastElementRef } = useInfiniteScroll(onLoadMore, { hasMore, enabled: enableInfiniteScroll, isLoading: currentLoading });

  useEffect(() => {
    if (!useExternalData) {
      onRowsChange?.(rows);
    }
  }, [rows, onRowsChange, useExternalData]);

  const handleCellChange = (rowIndex: number, columnId: string, value: any) => {
    if (useExternalData) return;
    setRows((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, [columnId]: value } : r)));
  };

  const handleAddRow = () => {
    if (useExternalData) return;

    const emptyRow: Record<string, any> = {};
    columns.forEach((col) => (emptyRow[col.id] = ""));
    setRows((prev) => [...prev, emptyRow]);
  };

  const sortedData = sortField ? getSortedData(currentData) : currentData;

  const [disabledSearchFields, setDisabledSearchCriteriaFields] = useState<string[]>([]);
  const searchCriteriaConfig = useMutate<SearchCriteriaConfigResponse>(apiConfig.launchJobList, { pageKey: pageKey });
  useEffect(() => {
    if (searchCriteriaConfig.data?.disabledFields) {
      setDisabledSearchCriteriaFields(searchCriteriaConfig.data.disabledFields);
    }
  }, [searchCriteriaConfig]);

  return (
    <Box sx={{ width: "100%", height: "100%" }}>
      {currentError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          錯誤：{currentError.message}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ boxShadow: "none", border: "none", borderRadius: 0, backgroundColor: "background.default", maxHeight: maxHeight ?? "none" }} elevation={0}>
        <Table
          size="small"
          stickyHeader
          sx={{
            "& .MuiTableCell-root": { borderBottom: "none" },
            "& .MuiTableRow-root:not(:last-child) .MuiTableCell-root": { borderBottom: "1px solid #e0e0e0" },
            "& .MuiTableHead-root .MuiTableCell-root": { borderBottom: "2px solid #1976d2" },
            "& .MuiTableRow-root:last-child .MuiTableCell-root": { borderBottom: "none" },
          }}
        >
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableHeaderCell key={col.id} column={col} isSorted={sortField === col.id} sortDirection={sortDirection} onSort={(columnId) => handleSort(columnId, !col.isActionColumn && col.sortable !== false)} />
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {sortedData.map((row, rowIndex) => (
              <TableRow key={rowIndex} ref={rowIndex === sortedData.length - 1 ? lastElementRef : null} sx={{ "&:hover": { backgroundColor: "#f5f5f5" } }}>
                {columns.map((col) => (
                  <TableDataCell key={col.id} column={col} row={row} rowIndex={rowIndex} isExternal={useExternalData} onChange={handleCellChange} extraRenderProps={extraRenderProps} />
                ))}
              </TableRow>
            ))}

            <TableFooter colSpan={columns.length} isExternal={useExternalData} enableInfiniteScroll={enableInfiniteScroll} hasMore={hasMore} isLoading={currentLoading} onAddRow={handleAddRow} />
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DynamicFormTable;

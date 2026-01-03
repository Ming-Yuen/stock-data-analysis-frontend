import React, { useState, useEffect, useMemo } from "react";
import { TableContainer, Table, TableHead, TableBody, TableRow, Paper, Box, Alert, TextField, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, FormGroup, FormControlLabel, Checkbox, Typography } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";

import { useInfiniteScroll } from "./hooks/useInfiniteScroll";
import { useTableSort } from "./hooks/useTableSort";
import { DynamicFormTableProps } from "./DynamicFormTable.types";
import { TableDataCell } from "./TableDataCell";
import { TableHeaderCell } from "./TableHeaderCell";
import { TableFooter } from "./TableFooter";

import { apiConfig } from "../../apiConfig";
import { useFetch, useMutate } from "../../hooks/api/useApi";
import { SearchCriteriaConfigResponse, UpdateCriteriaConfigRequest, UpdateCriteriaConfigResponse } from "../../services/types/dto/searchCriteria";

// ===================================
// DynamicFormTable
// ===================================
const DynamicFormTable: React.FC<DynamicFormTableProps> = ({ columns, initialRows = [], onRowsChange, data: externalData, loading = false, error = null, hasMore = false, onLoadMore, maxHeight, enableInfiniteScroll = true, extraRenderProps, pageKey }) => {
  // 本地 rows（只有在非外部數據模式才用）
  const [rows, setRows] = useState<Record<string, any>[]>(initialRows);

  // 搜尋相關狀態
  const [searchValues, setSearchValues] = useState<Record<string, string>>({});
  const [disabledSearchFields, setDisabledSearchFields] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [localDisabledFields, setLocalDisabledFields] = useState<string[]>([]);

  // 搜尋區高度（可拉動的 bar 控制）
  const [searchPanelHeight, setSearchPanelHeight] = useState<number>(180);
  const [isResizing, setIsResizing] = useState(false);

  const useExternalData = externalData !== undefined;
  const currentData = useExternalData ? externalData : rows;
  const currentLoading = useExternalData ? loading : false;
  const currentError = useExternalData ? error : null;

  const { sortField, sortDirection, handleSort, getSortedData } = useTableSort();

  const { lastElementRef } = useInfiniteScroll(onLoadMore, {
    hasMore,
    enabled: enableInfiniteScroll,
    isLoading: currentLoading,
  });

  // ========== 1. 讀取搜尋欄位設定（disabledFields） ==========
  const { data: criteriaConfig, isLoading: criteriaLoading } = useFetch<SearchCriteriaConfigResponse>(apiConfig.getSearchCriteriaConfig, { pageKey: pageKey }); // [web:72]

  useEffect(() => {
    if (criteriaConfig?.disabledFields) {
      setDisabledSearchFields(criteriaConfig.disabledFields);
    }
  }, [criteriaConfig]);

  // ========== 2. 更新搜尋欄位設定（disabledFields） ==========
  const updateCriteriaMutation = useMutate<UpdateCriteriaConfigResponse, UpdateCriteriaConfigRequest>(apiConfig.updateSearchCriteriaConfig); // [web:75]

  // rows 改變時通知外面
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
    columns.forEach((col) => {
      emptyRow[col.id] = "";
    });
    setRows((prev) => [...prev, emptyRow]);
  };

  const sortedData = sortField ? getSortedData(currentData) : currentData;

  // ========== 3. 搜尋邏輯 ==========
  const handleSearchChange = (columnId: string, value: string) => {
    setSearchValues((prev) => ({ ...prev, [columnId]: value }));
  };

  const filteredData = useMemo(() => {
    if (!sortedData) return [];

    const activeFilters = Object.entries(searchValues).filter(([field, value]) => value?.trim() && !disabledSearchFields.includes(field));

    if (activeFilters.length === 0) return sortedData;

    return sortedData.filter((row) =>
      activeFilters.every(([field, value]) => {
        const cell = row[field];
        if (cell == null) return false;
        return String(cell).toLowerCase().includes(value.toLowerCase());
      })
    );
  }, [sortedData, searchValues, disabledSearchFields]); // [web:73]

  // ========== 4. 設定 Dialog ==========
  useEffect(() => {
    if (settingsOpen) {
      setLocalDisabledFields(disabledSearchFields);
    }
  }, [settingsOpen, disabledSearchFields]);

  const handleToggleField = (fieldId: string) => {
    setLocalDisabledFields((prev) => (prev.includes(fieldId) ? prev.filter((f) => f !== fieldId) : [...prev, fieldId]));
  };

  const handleSaveSettings = () => {
    setDisabledSearchFields(localDisabledFields);
    console.log(pageKey);
    console.log(localDisabledFields);
    if (pageKey) {
      updateCriteriaMutation.mutate({
        pageKey,
        disabledFields: localDisabledFields,
      });
    }
    setSettingsOpen(false);
  };

  // ========== 5. 搜尋區高度調整（拖動 bar） ==========
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const delta = e.movementY;
    setSearchPanelHeight((prev) => {
      const next = prev + delta;
      return Math.min(Math.max(next, 80), 320); // 限制高度 80~320
    });
  };

  const handleMouseUp = () => {
    if (isResizing) {
      setIsResizing(false);
    }
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // ========== 6. Render ==========
  return (
    <Box sx={{ width: "100%", height: "100%" }}>
      {currentError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          錯誤：{currentError.message}
        </Alert>
      )}

      {/* 搜尋區：左側窄欄放設定 icon，右側是多列自動換行的 search criteria */}
      <Box sx={{ mb: 1 }}>
        <Box sx={{ display: "flex", gap: 2 }}>
          {/* 左側 setting column（狹窄，只在第一行放設定按鈕） */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 0.5 }}>
            <IconButton size="small" onClick={() => setSettingsOpen(true)} sx={{ mt: 0.5 }}>
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* 右側 search field 區：多列 + 自動換行 + 可滾動 */}
          {!criteriaLoading && (
            <Box sx={{ flex: 1, height: searchPanelHeight, overflowY: "auto", pr: 1 }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 2, rowGap: 1.5 }}>
                {columns
                  .filter((col) => !col.isActionColumn && !disabledSearchFields.includes(col.id))
                  .map((col) => (
                    <Box
                      key={col.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        // 一行多個 field，寬度不夠自動換行
                        width: { xs: "100%", sm: "48%", md: "32%" },
                        minWidth: 260,
                        maxWidth: 360,
                      }}
                    >
                      {/* 左邊 label */}
                      <Box sx={{ width: 120, textAlign: "right", pr: 1 }}>
                        <Typography variant="body2">{col.label ?? col.id}</Typography>
                      </Box>

                      {/* 右邊 TextField */}
                      <Box sx={{ flex: 1 }}>
                        <TextField size="small" fullWidth value={searchValues[col.id] ?? ""} onChange={(e) => handleSearchChange(col.id, e.target.value)} />
                      </Box>
                    </Box>
                  ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* 搜尋區與表格之間的 bar，可拖動調整搜尋區高度 */}
      <Box onMouseDown={handleMouseDown} sx={{ height: 6, cursor: "row-resize", bgcolor: "#e0e0e0", mb: 1, borderRadius: 3 }} />

      <TableContainer component={Paper} sx={{ boxShadow: "none", border: "none", borderRadius: 0, backgroundColor: "background.default", maxHeight: maxHeight ?? "none" }} elevation={0}>
        <Table
          size="small"
          stickyHeader
          sx={{
            "& .MuiTableCell-root": { borderBottom: "none" },
            "& .MuiTableRow-root:not(:last-child) .MuiTableCell-root": {
              borderBottom: "1px solid #e0e0e0",
            },
            "& .MuiTableHead-root .MuiTableCell-root": {
              borderBottom: "2px solid #1976d2",
            },
            "& .MuiTableRow-root:last-child .MuiTableCell-root": {
              borderBottom: "none",
            },
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
            {filteredData.map((row, rowIndex) => (
              <TableRow key={rowIndex} ref={rowIndex === filteredData.length - 1 ? lastElementRef : null} sx={{ "&:hover": { backgroundColor: "#f5f5f5" } }}>
                {columns.map((col) => (
                  <TableDataCell key={col.id} column={col} row={row} rowIndex={rowIndex} isExternal={useExternalData} onChange={handleCellChange} extraRenderProps={extraRenderProps} />
                ))}
              </TableRow>
            ))}

            <TableFooter colSpan={columns.length} isExternal={useExternalData} enableInfiniteScroll={enableInfiniteScroll} hasMore={hasMore} isLoading={currentLoading} onAddRow={handleAddRow} />
          </TableBody>
        </Table>
      </TableContainer>

      {/* 搜尋欄位設定 Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>搜尋欄位設定</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 1 }}>
            勾選代表「不顯示」該搜尋欄位。
          </Typography>
          <FormGroup>
            {columns
              .filter((col) => !col.isActionColumn)
              .map((col) => (
                <FormControlLabel key={col.id} control={<Checkbox checked={localDisabledFields.includes(col.id)} onChange={() => handleToggleField(col.id)} />} label={col.label ?? col.id} />
              ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>取消</Button>
          <Button onClick={handleSaveSettings} variant="contained" disabled={updateCriteriaMutation.isPending}>
            儲存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DynamicFormTable;

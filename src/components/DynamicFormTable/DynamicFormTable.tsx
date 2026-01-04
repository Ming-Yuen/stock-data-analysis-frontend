import React, { useState, useEffect, useMemo } from "react";
import { TableContainer, Table, TableHead, TableBody, TableRow, Paper, Box, Alert, TextField, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, FormGroup, FormControlLabel, Checkbox, Typography, MenuItem, Select } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";

import { useInfiniteScroll } from "./hooks/useInfiniteScroll";
import { useTableSort } from "./hooks/useTableSort";
import { DynamicFormTableProps, Column } from "./DynamicFormTable.types";
import { TableDataCell } from "./TableDataCell";
import { TableHeaderCell } from "./TableHeaderCell";
import { TableFooter } from "./TableFooter";

import { apiConfig } from "../../apiConfig";
import { useFetch, useMutate } from "../../hooks/api/useApi";
import { SearchCriteriaConfigResponse, UpdateCriteriaConfigRequest, UpdateCriteriaConfigResponse } from "../../services/types/dto/searchCriteria";

// ========= 搜尋 state 型別 =========
type TextSearchValue = string;

type NumberSearchValue = {
  value: string;
};

type DateRangeSearchValue = {
  from?: string;
  to?: string;
};

type SearchValue = TextSearchValue | NumberSearchValue | DateRangeSearchValue;
type SearchValuesState = Record<string, SearchValue>;

// ===================================
// DynamicFormTable
// ===================================
const DynamicFormTable: React.FC<DynamicFormTableProps> = ({ columns, initialRows = [], onRowsChange, data: externalData, loading = false, error = null, hasMore = false, onLoadMore, maxHeight, enableInfiniteScroll = true, extraRenderProps, pageKey }) => {
  // 本地 rows（只有在非外部數據模式才用）
  const [rows, setRows] = useState<Record<string, any>[]>(initialRows);

  // 搜尋相關狀態
  const [searchValues, setSearchValues] = useState<SearchValuesState>({});
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
  const { data: criteriaConfig, isLoading: criteriaLoading } = useFetch<SearchCriteriaConfigResponse>(apiConfig.getSearchCriteriaConfig, {
    pageKey: pageKey,
  }); // [web:22]

  useEffect(() => {
    if (criteriaConfig?.disabledFields) {
      setDisabledSearchFields(criteriaConfig.disabledFields);
    }
  }, [criteriaConfig]);

  // ========== 2. 更新搜尋欄位設定（disabledFields） ==========
  const updateCriteriaMutation = useMutate<UpdateCriteriaConfigResponse, UpdateCriteriaConfigRequest>(apiConfig.updateSearchCriteriaConfig); // [web:23]

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

  // ========== 3. 搜尋 value 更新 ==========
  const handleTextSearchChange = (columnId: string, value: string) => {
    setSearchValues((prev) => ({
      ...prev,
      [columnId]: value,
    }));
  };

  const handleNumberSearchChange = (columnId: string, value: string) => {
    setSearchValues((prev) => ({
      ...prev,
      [columnId]: { value },
    }));
  };

  const handleDateRangeChange = (columnId: string, key: "from" | "to", value: string) => {
    setSearchValues((prev) => {
      const prevVal = prev[columnId] as DateRangeSearchValue | undefined;
      return {
        ...prev,
        [columnId]: {
          ...(prevVal || {}),
          [key]: value || undefined,
        },
      };
    });
  };

  // 解析日期（可根據 col.sourceDateFormat 自行加 dayjs/moment）
  const parseDateValue = (val: any, col: Column): Date | null => {
    if (val == null) return null;
    if (val instanceof Date) return val;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  // 從表格數據自動生成 select options（若 column 本身沒提供）
  const getSelectOptionsFromData = (col: Column) => {
    if (col.selectOptions && col.selectOptions.length > 0) {
      return col.selectOptions;
    }
    const unique = new Set<string>();
    currentData.forEach((row) => {
      const v = row[col.id];
      if (v !== null && v !== undefined && v !== "") {
        unique.add(String(v));
      }
    });
    return Array.from(unique).map((v) => ({ label: v, value: v }));
  };

  // ========== 4. 搜尋 filter 邏輯 ==========
  const filteredData = useMemo(() => {
    if (!sortedData) return [];

    const activeFiltersEntries = Object.entries(searchValues).filter(([field, value]) => {
      if (disabledSearchFields.includes(field)) return false;
      const col = columns.find((c) => c.id === field);
      if (!col) return false;

      if (col.type === "number") {
        const v = value as NumberSearchValue;
        return v?.value !== undefined && v.value !== "";
      }

      if (col.type === "date" || col.type === "datetime") {
        const v = value as DateRangeSearchValue;
        return !!v?.from || !!v?.to;
      }

      return typeof value === "string" && value.trim() !== "";
    });

    if (activeFiltersEntries.length === 0) return sortedData;

    return sortedData.filter((row) =>
      activeFiltersEntries.every(([field, value]) => {
        const col = columns.find((c) => c.id === field);
        if (!col) return true;

        const cell = row[field];

        // text / select
        if (!col.type || col.type === "text" || col.type === "select") {
          const v = (value as TextSearchValue)?.trim();
          if (!v) return true;
          if (cell == null) return false;
          return String(cell).toLowerCase().includes(v.toLowerCase());
        }

        // number
        if (col.type === "number") {
          const vObj = value as NumberSearchValue;
          if (!vObj?.value && vObj.value !== "0") return true;
          if (cell == null) return false;

          const filterNum = Number(vObj.value);
          if (isNaN(filterNum)) return true;

          const cellNum = Number(cell);
          if (isNaN(cellNum)) return false;

          return cellNum === filterNum;
        }

        // date / datetime
        if (col.type === "date" || col.type === "datetime") {
          const v = value as DateRangeSearchValue;
          const from = v?.from ? new Date(v.from) : undefined;
          const to = v?.to ? new Date(v.to) : undefined;

          if (!from && !to) return true;
          const cellDate = parseDateValue(cell, col);
          if (!cellDate) return false;

          const time = cellDate.getTime();
          if (from && time < from.getTime()) return false;
          if (to && time > to.getTime()) return false;
          return true;
        }

        return true;
      })
    );
  }, [sortedData, searchValues, disabledSearchFields, columns]); // [web:31]

  // ========== 5. 設定 Dialog ==========
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
    if (pageKey) {
      updateCriteriaMutation.mutate({
        pageKey,
        disabledFields: localDisabledFields,
      });
    }
    setSettingsOpen(false);
  };

  // ========== 6. 搜尋區高度調整（拖動 bar） ==========
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const delta = e.movementY;
    setSearchPanelHeight((prev) => {
      const next = prev + delta;
      return Math.min(Math.max(next, 80), 320);
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

  // ========== 7. Render 搜尋欄位（依 type） ==========
  const renderSearchField = (col: Column) => {
    if (col.isActionColumn) return null;
    if (disabledSearchFields.includes(col.id)) return null;

    // select：用 dropdown（優先用 col.selectOptions，否則從 data 生成）
    if (col.type === "select") {
      const value = (searchValues[col.id] as TextSearchValue) ?? "";
      const options = getSelectOptionsFromData(col);
      return (
        <Select size="small" fullWidth displayEmpty value={value} onChange={(e) => handleTextSearchChange(col.id, e.target.value as string)}>
          <MenuItem value="">
            <em>All</em>
          </MenuItem>
          {options.map((opt) => (
            <MenuItem key={opt.value} value={String(opt.value)}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      );
    }

    // text
    if (!col.type || col.type === "text") {
      const value = (searchValues[col.id] as TextSearchValue) ?? "";
      return <TextField size="small" fullWidth value={value} onChange={(e) => handleTextSearchChange(col.id, e.target.value)} />;
    }

    // number
    if (col.type === "number") {
      const vObj = (searchValues[col.id] as NumberSearchValue) || {
        value: "",
      };
      return (
        <TextField
          size="small"
          fullWidth
          type="number"
          value={vObj.value}
          onChange={(e) => handleNumberSearchChange(col.id, e.target.value)}
          inputProps={{
            inputMode: "numeric",
            pattern: "[0-9]*",
          }}
        />
      );
    }

    // date / datetime：from / to
    if (col.type === "date" || col.type === "datetime") {
      const v = (searchValues[col.id] as DateRangeSearchValue) || {};
      const isDateOnly = col.type === "date";
      return (
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField size="small" fullWidth label="From" type={isDateOnly ? "date" : "datetime-local"} value={v.from ?? ""} onChange={(e) => handleDateRangeChange(col.id, "from", e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" fullWidth label="To" type={isDateOnly ? "date" : "datetime-local"} value={v.to ?? ""} onChange={(e) => handleDateRangeChange(col.id, "to", e.target.value)} InputLabelProps={{ shrink: true }} />
        </Box>
      );
    }

    // fallback -> text
    const value = (searchValues[col.id] as TextSearchValue) ?? "";
    return <TextField size="small" fullWidth value={value} onChange={(e) => handleTextSearchChange(col.id, e.target.value)} />;
  };

  // 把欄位依「一行兩個普通欄位 + 範圍欄位單獨一行」分組
  const buildSearchRows = (visibleColumns: Column[]): Column[][] => {
    const rows: Column[][] = [];
    let currentRow: Column[] = [];

    visibleColumns.forEach((col) => {
      const isRangeType = col.type === "date" || col.type === "datetime";

      if (isRangeType) {
        if (currentRow.length > 0) {
          rows.push(currentRow);
          currentRow = [];
        }
        rows.push([col]);
        return;
      }

      currentRow.push(col);
      if (currentRow.length === 2) {
        rows.push(currentRow);
        currentRow = [];
      }
    });

    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return rows;
  };

  // ========== 8. Render ==========
  const visibleSearchColumns = columns.filter((col) => !col.isActionColumn && !disabledSearchFields.includes(col.id));
  const searchRows = buildSearchRows(visibleSearchColumns);

  return (
    <Box sx={{ width: "100%", height: "100%" }}>
      {currentError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          錯誤：{currentError.message}
        </Alert>
      )}

      {/* 搜尋區：左側設定 icon，右側 search criteria */}
      <Box sx={{ mb: 1 }}>
        <Box sx={{ display: "flex", gap: 2 }}>
          {/* 左側 setting column */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              pt: 0.5,
            }}
          >
            <IconButton size="small" onClick={() => setSettingsOpen(true)} sx={{ mt: 0.5 }}>
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* 右側 search field 區：按 row 分組 + 可滾動，靠左 */}
          {!criteriaLoading && (
            <Box
              sx={{
                flex: 1,
                height: searchPanelHeight,
                overflowY: "auto",
                pr: 1,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                  maxWidth: 900, // 原 1100，收窄一點
                  width: "100%",
                }}
              >
                {searchRows.map((rowCols, rowIndex) => (
                  <Box
                    key={rowIndex}
                    sx={{
                      display: "flex",
                      gap: 2,
                    }}
                  >
                    {rowCols.map((col) => {
                      const isRangeType = col.type === "date" || col.type === "datetime";
                      return (
                        <Box
                          key={col.id}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            flex: isRangeType ? "1 1 100%" : "1 1 50%",
                            minWidth: isRangeType ? 320 : 260,
                            maxWidth: isRangeType ? 900 : 420, // 普通欄位 420，整體更小
                          }}
                        >
                          <Box sx={{ width: 120, textAlign: "right", pr: 1 }}>
                            <Typography variant="body2">{col.label ?? col.id}</Typography>
                          </Box>
                          <Box sx={{ flex: 1 }}>{renderSearchField(col)}</Box>
                        </Box>
                      );
                    })}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* 搜尋區與表格之間的 bar，可拖動調整搜尋區高度 */}
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          height: 6,
          cursor: "row-resize",
          bgcolor: "#e0e0e0",
          mb: 1,
          borderRadius: 3,
        }}
      />

      <TableContainer
        component={Paper}
        sx={{
          boxShadow: "none",
          border: "none",
          borderRadius: 0,
          backgroundColor: "background.default",
          maxHeight: maxHeight ?? "none",
        }}
        elevation={0}
      >
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

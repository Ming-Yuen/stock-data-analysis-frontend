import React, { useState, useEffect, useMemo, useCallback } from "react";
import { TableContainer, Table, TableHead, TableBody, TableRow, Paper, Box, Alert, TextField, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, FormGroup, FormControlLabel, Checkbox, Typography, MenuItem, Select, Stack } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { Search } from "@mui/icons-material";

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

// 三态：undefined=All, true/false=过滤
type BooleanSearchValue = boolean | undefined;

type SearchValue = TextSearchValue | NumberSearchValue | DateRangeSearchValue | BooleanSearchValue;

type SearchValuesState = Record<string, SearchValue>;

const DynamicFormTable: React.FC<DynamicFormTableProps> = ({ columns, initialRows = [], onRowsChange, data: externalData, loading = false, error = null, hasMore = false, onLoadMore, maxHeight, enableInfiniteScroll = true, extraRenderProps, pageKey, toolbarActions, onSearch }) => {
  const [rows, setRows] = useState<Record<string, any>[]>(initialRows);

  const [searchValues, setSearchValues] = useState<SearchValuesState>({});
  const [disabledSearchFields, setDisabledSearchFields] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [localDisabledFields, setLocalDisabledFields] = useState<string[]>([]);

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

  // 1) 讀取搜尋欄位設定
  const { data: criteriaConfig, isLoading: criteriaLoading } = useFetch<SearchCriteriaConfigResponse>(apiConfig.getSearchCriteriaConfig, {
    pageKey: pageKey,
  });

  useEffect(() => {
    if (criteriaConfig?.disabledFields) {
      setDisabledSearchFields(criteriaConfig.disabledFields);
    }
  }, [criteriaConfig]);

  // 2) 更新搜尋欄位設定
  const updateCriteriaMutation = useMutate<UpdateCriteriaConfigResponse, UpdateCriteriaConfigRequest>(apiConfig.updateSearchCriteriaConfig);

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
      emptyRow[col.id] = col.type === "checkbox" ? false : "";
    });
    setRows((prev) => [...prev, emptyRow]);
  };

  const sortedData = sortField ? getSortedData(currentData) : currentData;

  // 搜尋值更新
  const handleTextSearchChange = (columnId: string, value: string) => {
    const col = columns.find((c) => c.id === columnId);
    const v = col?.uppercase ? value.toUpperCase() : value;
    console.log(col);
    setSearchValues((prev) => ({ ...prev, [columnId]: v }));
  };

  const handleNumberSearchChange = (columnId: string, value: string) => {
    setSearchValues((prev) => ({ ...prev, [columnId]: { value } }));
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

  const handleBooleanSearchChange = (columnId: string, value: BooleanSearchValue) => {
    setSearchValues((prev) => ({ ...prev, [columnId]: value }));
  };

  const handleClearAllSearch = () => {
    setSearchValues({});
  };

  const parseDateValue = (val: any, col: Column): Date | null => {
    if (val == null) return null;
    if (val instanceof Date) return val;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

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

  // 过滤后的表格数据（前端过滤；externalData 时你也可以选择 skip，本版保持原逻辑）
  const filteredData = useMemo(() => {
    if (!sortedData) return [];

    const activeFiltersEntries = Object.entries(searchValues).filter(([field, value]) => {
      if (disabledSearchFields.includes(field)) return false;
      const col = columns.find((c) => c.id === field);
      if (!col) return false;

      if (col.type === "checkbox") {
        // 三态：只有 true/false 才算 active
        return typeof value === "boolean";
      }

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

        if (col.type === "checkbox") {
          const expected = value as boolean;
          return Boolean(cell) === expected;
        }

        if (!col.type || col.type === "text" || col.type === "select") {
          const v = (value as TextSearchValue)?.trim();
          if (!v) return true;
          if (cell == null) return false;
          return String(cell).toLowerCase().includes(v.toLowerCase());
        }

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
  }, [sortedData, searchValues, disabledSearchFields, columns]);

  // settings dialog
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

  // resize
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
    if (isResizing) setIsResizing(false);
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

  // ===== 把 searchValues 变成“非空 criteria” =====
  const buildCriteria = useCallback((values: SearchValuesState) => {
    const criteria: Record<string, any> = {};

    Object.entries(values).forEach(([field, v]) => {
      // checkbox: 三态 -> 只有 boolean 才传
      if (typeof v === "boolean") {
        criteria[field] = v;
        return;
      }

      // text / select
      if (typeof v === "string") {
        const s = v.trim();
        if (s !== "") criteria[field] = s;
        return;
      }

      // number: { value }
      if (v && typeof v === "object" && "value" in v) {
        const s = String((v as NumberSearchValue).value ?? "").trim();
        if (s !== "") criteria[field] = Number(s);
        return;
      }

      // date range: { from, to }
      if (v && typeof v === "object" && ("from" in v || "to" in v)) {
        const dr = v as DateRangeSearchValue;
        const from = dr.from || undefined;
        const to = dr.to || undefined;
        if (from || to) criteria[field] = { from, to };
        return;
      }
    });

    return criteria;
  }, []);

  const handleSearchClick = () => {
    const criteria = buildCriteria(searchValues);
    onSearch?.(criteria);
  };

  const normalizeInput = (col: Column, value: any) => {
    if (!col.uppercase) return value;
    if (value == null) return value;
    return String(value).toUpperCase(); // 可加 trim()
  };

  // Render search field
  const renderSearchField = (col: Column) => {
    if (col.isActionColumn) return null;
    if (disabledSearchFields.includes(col.id)) return null;

    if (col.type === "checkbox") {
      const val = searchValues[col.id] as BooleanSearchValue;
      const selectValue = val === undefined ? "" : val ? "true" : "false";

      return (
        <Select
          size="small"
          fullWidth
          displayEmpty
          value={selectValue}
          onChange={(e) => {
            const v = e.target.value as string;
            if (v === "") handleBooleanSearchChange(col.id, undefined);
            else handleBooleanSearchChange(col.id, v === "true");
          }}
        >
          <MenuItem value="">
            <em>All</em>
          </MenuItem>
          <MenuItem value="true">True</MenuItem>
          <MenuItem value="false">False</MenuItem>
        </Select>
      );
    }

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

    if (!col.type || col.type === "text") {
      const value = (searchValues[col.id] as TextSearchValue) ?? "";
      return (
        <TextField
          size="small"
          fullWidth
          value={value}
          onChange={(e) => handleTextSearchChange(col.id, e.target.value)}
          slotProps={{
            htmlInput: {
              style: col.uppercase ? { textTransform: "uppercase" } : undefined,
            },
          }}
        />
      );
    }

    if (col.type === "number") {
      const vObj = (searchValues[col.id] as NumberSearchValue) || { value: "" };
      return <TextField size="small" fullWidth type="number" value={vObj.value} onChange={(e) => handleNumberSearchChange(col.id, e.target.value)} inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }} />;
    }

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

    const value = (searchValues[col.id] as TextSearchValue) ?? "";
    return <TextField size="small" fullWidth value={value} onChange={(e) => handleTextSearchChange(col.id, e.target.value)} />;
  };

  // build rows
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

    if (currentRow.length > 0) rows.push(currentRow);
    return rows;
  };

  const visibleSearchColumns = columns.filter((col) => !col.isActionColumn && !disabledSearchFields.includes(col.id));
  const searchRows = buildSearchRows(visibleSearchColumns);

  return (
    <Box sx={{ width: "100%", height: "100%" }}>
      {/* 右上角按钮区 */}
      <Box
        sx={{
          mb: 1,
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" size="small" onClick={handleClearAllSearch}>
            Clear
          </Button>

          <IconButton size="small" onClick={() => setSettingsOpen(true)} sx={{ mt: 0.2 }}>
            <SettingsIcon fontSize="small" />
          </IconButton>

          <Button variant="outlined" size="small" startIcon={<Search />} onClick={handleSearchClick}>
            Search
          </Button>

          {toolbarActions}
        </Stack>
      </Box>

      {currentError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          錯誤：{(currentError as any).message}
        </Alert>
      )}

      {/* 搜尋區 */}
      <Box sx={{ mb: 1 }}>
        {!criteriaLoading && (
          <Box sx={{ flex: 1, height: searchPanelHeight, overflowY: "auto", pr: 1 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                maxWidth: 900,
                width: "100%",
              }}
            >
              {searchRows.map((rowCols, rowIndex) => (
                <Box key={rowIndex} sx={{ display: "flex", gap: 2 }}>
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
                          maxWidth: isRangeType ? 900 : 420,
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

      {/* 拖动条 */}
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

      {/* 表格 */}
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

      {/* 設定 Dialog */}
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

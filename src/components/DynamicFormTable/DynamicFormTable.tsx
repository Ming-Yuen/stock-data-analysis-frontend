import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  Paper,
  Box,
  Alert,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  MenuItem,
  Select,
  Stack,
  TableCell,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { Search, Add, ArrowUpward, ArrowDownward } from "@mui/icons-material";
import { useInfiniteScroll } from "./hooks/useInfiniteScroll";
import { useTableSort } from "./hooks/useTableSort";
import { useDateFormatter } from "./hooks/useDateFormatter";
import { useFetch, useMutate } from "../../hooks/api/useApi";
import { apiConfig } from "../../apiConfig";
import type { DynamicFormTableProps, Column } from "./DynamicFormTable.types";
import type {
  SearchCriteriaConfigResponse,
  UpdateCriteriaConfigRequest,
  UpdateCriteriaConfigResponse,
} from "../../services/types/dto/searchCriteria";
import { useTranslation } from "react-i18next";

type BooleanSearchValue = boolean | undefined;
type TextSearchValue = string;
type NumberSearchValue = { value: string };
type DateRangeSearchValue = { from?: string; to?: string };
type SearchValue =
  | TextSearchValue
  | NumberSearchValue
  | DateRangeSearchValue
  | BooleanSearchValue;
type SearchValuesState = Record<string, SearchValue>;

const DynamicFormTable: React.FC<DynamicFormTableProps> = ({
  columns,
  initialRows = [],
  onRowsChange,
  data: externalData,
  loading = false,
  error = null,
  hasMore = false,
  onLoadMore,
  maxHeight,
  enableInfiniteScroll = true,
  extraRenderProps,
  pageKey,
  title,
  toolbarActions,
  onSearch,
  onSearchFieldChange,
}) => {
  const { t } = useTranslation();
  const useExternalData = externalData !== undefined;

  const [displayData, setDisplayData] = useState<Record<string, any>[]>(
    useExternalData ? externalData : initialRows
  );

  const [searchValues, setSearchValues] = useState<SearchValuesState>({});
  const [disabledSearchFields, setDisabledSearchFields] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [localDisabledFields, setLocalDisabledFields] = useState<string[]>([]);
  const [searchPanelHeight, setSearchPanelHeight] = useState<number>(180);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (useExternalData && externalData) {
      setDisplayData(externalData);
    }
  }, [useExternalData, externalData]);

  useEffect(() => {
    if (!useExternalData) {
      onRowsChange?.(displayData);
    }
  }, [displayData, onRowsChange, useExternalData]);

  const currentLoading = useExternalData ? loading : false;
  const currentError = useExternalData ? error : null;

  const { sortField, sortDirection, handleSort, getSortedData } = useTableSort();
  const { lastElementRef } = useInfiniteScroll(onLoadMore, {
    hasMore,
    enabled: enableInfiniteScroll,
    isLoading: currentLoading,
  });
  const { formatDate } = useDateFormatter();

  const { data: criteriaConfig, isLoading: criteriaLoading } =
    useFetch<SearchCriteriaConfigResponse>(apiConfig.getSearchCriteriaConfig, {
      pageKey: pageKey,
    });

  useEffect(() => {
    if (criteriaConfig?.disabledFields) {
      setDisabledSearchFields(criteriaConfig.disabledFields);
    }
  }, [criteriaConfig]);

  const updateCriteriaMutation = useMutate<
    UpdateCriteriaConfigResponse,
    UpdateCriteriaConfigRequest
  >(apiConfig.updateSearchCriteriaConfig);

  const handleCellChange = async (
    rowIndex: number,
    columnId: string,
    value: any
  ) => {
    const col = columns.find((c) => c.id === columnId);

    if (useExternalData && col?.type !== "checkbox") {
      return;
    }

    const updatedRows = displayData.map((r, i) =>
      i === rowIndex ? { ...r, [columnId]: value } : r
    );
    setDisplayData(updatedRows);

    if (useExternalData) {
      onRowsChange?.(updatedRows);
    }

    if (col?.onChange) {
      try {
        await col.onChange(value, updatedRows[rowIndex]);
      } catch (err) {
        console.error("Column action failed:", err);
      }
    }
  };

  const handleAddRow = () => {
    if (useExternalData) return;
    const emptyRow: Record<string, any> = {};
    columns.forEach((col) => {
      emptyRow[col.id] = col.type === "checkbox" ? false : "";
    });
    setDisplayData((prev) => [...prev, emptyRow]);
  };

  const sortedData = sortField ? getSortedData(displayData) : displayData;

  const handleTextSearchChange = (columnId: string, value: string) => {
    const col = columns.find((c) => c.id === columnId);
    const v = col?.uppercase ? value.toUpperCase() : value;

    setSearchValues((prev) => {
      const next: SearchValuesState = { ...prev };

      if (columnId === "industry") {
        next["category"] = "";
        next["subCategory"] = "";
      } else if (columnId === "category") {
        next["subCategory"] = "";
      }

      next[columnId] = v;
      onSearchFieldChange?.(columnId, v, next as Record<string, any>);
      return next;
    });
  };

  const handleNumberSearchChange = (columnId: string, value: string) => {
    setSearchValues((prev) => {
      const next: SearchValuesState = { ...prev, [columnId]: { value } };
      onSearchFieldChange?.(columnId, { value }, next as Record<string, any>);
      return next;
    });
  };

  const handleDateRangeChange = (
    columnId: string,
    key: "from" | "to",
    value: string
  ) => {
    setSearchValues((prev) => {
      const prevVal = prev[columnId] as DateRangeSearchValue | undefined;
      const nextVal: DateRangeSearchValue = {
        ...(prevVal || {}),
        [key]: value || undefined,
      };
      const next: SearchValuesState = { ...prev, [columnId]: nextVal };
      onSearchFieldChange?.(columnId, nextVal, next as Record<string, any>);
      return next;
    });
  };

  const handleBooleanSearchChange = (
    columnId: string,
    value: BooleanSearchValue
  ) => {
    setSearchValues((prev) => {
      const next: SearchValuesState = { ...prev, [columnId]: value };
      onSearchFieldChange?.(columnId, value, next as Record<string, any>);
      return next;
    });
  };

  const handleClearAllSearch = () => {
    setSearchValues({});
    onSearchFieldChange?.("", "", {});
  };

  const parseDateValue = (val: any): Date | null => {
    if (val == null) return null;
    if (val instanceof Date) return val;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  const filteredData = useMemo(() => {
    if (!sortedData) return [];

    const activeFiltersEntries = Object.entries(searchValues).filter(
      ([field, value]) => {
        if (disabledSearchFields.includes(field)) return false;
        const col = columns.find((c) => c.id === field);
        if (!col) return false;

        if (col.type === "checkbox") return typeof value === "boolean";
        if (col.type === "number") {
          const v = value as NumberSearchValue;
          return v?.value !== undefined && v.value !== "";
        }
        if (col.type === "date" || col.type === "datetime") {
          const v = value as DateRangeSearchValue;
          return !!v?.from || !!v?.to;
        }
        return typeof value === "string" && value.trim() !== "";
      }
    );

    if (activeFiltersEntries.length === 0) return sortedData;

    return sortedData.filter((row) =>
      activeFiltersEntries.every(([field, value]) => {
        const col = columns.find((c) => c.id === field);
        if (!col) return true;
        const cell = row[field];

        if (col.type === "checkbox") {
          return Boolean(cell) === (value as boolean);
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
          const cellDate = parseDateValue(cell);
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

  useEffect(() => {
    if (settingsOpen) {
      setLocalDisabledFields(disabledSearchFields);
    }
  }, [settingsOpen, disabledSearchFields]);

  const handleToggleField = (fieldId: string) => {
    setLocalDisabledFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((f) => f !== fieldId)
        : [...prev, fieldId]
    );
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

  const buildCriteria = useCallback((values: SearchValuesState) => {
    const criteria: Record<string, any> = {};
    Object.entries(values).forEach(([field, v]) => {
      if (typeof v === "boolean") {
        criteria[field] = v;
        return;
      }
      if (typeof v === "string") {
        const s = v.trim();
        if (s !== "") criteria[field] = s;
        return;
      }
      if (v && typeof v === "object" && "value" in v) {
        const s = String((v as NumberSearchValue).value ?? "").trim();
        if (s !== "") criteria[field] = Number(s);
        return;
      }
      if (v && typeof v === "object" && ("from" in v || "to" in v)) {
        const dr = v as DateRangeSearchValue;
        const from = dr.from || undefined;
        const to = dr.to || undefined;
        if (from || to) criteria[field] = { from, to };
      }
    });
    return criteria;
  }, []);

  const handleSearchClick = () => {
    const criteria = buildCriteria(searchValues);
    onSearch?.(criteria);
  };

  const getDisplayValue = (col: Column, raw: any): string => {
    if (raw == null || raw === "") return "";
    if (col.translateValue) return t(`${String(raw)}`);
    return String(raw);
  };

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
            <em>{t("All")}</em>
          </MenuItem>
          <MenuItem value="true">True</MenuItem>
          <MenuItem value="false">False</MenuItem>
        </Select>
      );
    }

    if (col.type === "select") {
      const value = (searchValues[col.id] as TextSearchValue) ?? "";
      const options = col.selectOptions ?? [];
      return (
        <Select
          size="small"
          fullWidth
          displayEmpty
          value={value}
          onChange={(e) => handleTextSearchChange(col.id, e.target.value as string)}
        >
          <MenuItem value="">
            <em>{t("All")}</em>
          </MenuItem>
          {options.map((opt) => (
            <MenuItem key={opt.value} value={String(opt.value)}>
              {getDisplayValue(col, opt.value)}
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
      return (
        <TextField
          size="small"
          fullWidth
          type="number"
          value={vObj.value}
          onChange={(e) => handleNumberSearchChange(col.id, e.target.value)}
          inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
        />
      );
    }

    if (col.type === "date" || col.type === "datetime") {
      const v = (searchValues[col.id] as DateRangeSearchValue) || {};
      const isDateOnly = col.type === "date";
      return (
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            size="small"
            fullWidth
            label="From"
            type={isDateOnly ? "date" : "datetime-local"}
            value={v.from ?? ""}
            onChange={(e) => handleDateRangeChange(col.id, "from", e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            fullWidth
            label="To"
            type={isDateOnly ? "date" : "datetime-local"}
            value={v.to ?? ""}
            onChange={(e) => handleDateRangeChange(col.id, "to", e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      );
    }

    const value = (searchValues[col.id] as TextSearchValue) ?? "";
    return (
      <TextField
        size="small"
        fullWidth
        value={value}
        onChange={(e) => handleTextSearchChange(col.id, e.target.value)}
      />
    );
  };

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

  const visibleSearchColumns = columns.filter(
    (col) => !col.isActionColumn && !disabledSearchFields.includes(col.id)
  );
  const searchRows = buildSearchRows(visibleSearchColumns);

  const renderCell = (col: Column, row: Record<string, any>, rowIndex: number) => {
    if (col.render) {
      return <TableCell>{col.render(row[col.id], row, rowIndex, extraRenderProps)}</TableCell>;
    }

    const value = row[col.id];

    if (col.type === "checkbox") {
      return (
        <TableCell>
          <Checkbox
            size="small"
            checked={Boolean(value)}
            onChange={(e) => handleCellChange(rowIndex, col.id, e.target.checked)}
          />
        </TableCell>
      );
    }

    if (useExternalData) {
      if (col.type === "date" || col.type === "datetime") {
        const formatted = formatDate(value, col.sourceDateFormat, col.displayDateFormat);
        return (
          <TableCell>
            <Typography variant="body2">{formatted}</Typography>
          </TableCell>
        );
      }
      return (
        <TableCell>
          <Typography variant="body2">
            {value != null && value !== "" ? getDisplayValue(col, value) : "N/A"}
          </Typography>
        </TableCell>
      );
    }

    if (col.type === "select") {
      return (
        <TableCell>
          <Select
            fullWidth
            size="small"
            value={row[col.id] ?? ""}
            onChange={(e) => handleCellChange(rowIndex, col.id, e.target.value)}
          >
            {col.selectOptions?.map((opt) => {
              const raw = opt.label ?? opt.value;
              const text = col.translateValue ? t(`${String(raw)}`) : String(raw);
              return (
                <MenuItem key={opt.value} value={String(opt.value)}>
                  {text}
                </MenuItem>
              );
            })}
          </Select>
        </TableCell>
      );
    }

    return (
      <TableCell>
        <TextField
          fullWidth
          size="small"
          type={col.type || "text"}
          value={row[col.id] ?? ""}
          onChange={(e) => handleCellChange(rowIndex, col.id, e.target.value)}
          variant="outlined"
        />
      </TableCell>
    );
  };

  const renderHeaderCell = (col: Column) => {
    const isSortable = !col.isActionColumn && col.sortable !== false;
    return (
      <TableCell
        key={col.id}
        sx={{
          width: col.width,
          fontWeight: "bold",
          backgroundColor: "primary.main",
          color: "primary.contrastText",
          cursor: isSortable ? "pointer" : "default",
          userSelect: "none",
          "&:hover": isSortable ? { backgroundColor: "primary.dark" } : {},
        }}
        onClick={() =>
          isSortable &&
          handleSort(col.id, !col.isActionColumn && col.sortable !== false)
        }
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography variant="body2" component="span">
            {col.label}
          </Typography>
          {isSortable && (
            <Box sx={{ display: "flex", flexDirection: "column", ml: 0.5 }}>
              <ArrowUpward
                sx={{
                  fontSize: 14,
                  opacity: sortField === col.id && sortDirection === "asc" ? 1 : 0.3,
                }}
              />
              <ArrowDownward
                sx={{
                  fontSize: 14,
                  marginTop: "-8px",
                  opacity: sortField === col.id && sortDirection === "desc" ? 1 : 0.3,
                }}
              />
            </Box>
          )}
        </Box>
      </TableCell>
    );
  };

  return (
    <Box sx={{ width: "100%", height: "100%" }}>
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

      <Box sx={{ mb: 1 }}>
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
            <TableRow>{columns.map((col) => renderHeaderCell(col))}</TableRow>
          </TableHead>

          <TableBody>
            {filteredData.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                ref={rowIndex === filteredData.length - 1 ? lastElementRef : null}
                sx={{ "&:hover": { backgroundColor: "#f5f5f5" } }}
              >
                {columns.map((col) => (
                  <React.Fragment key={col.id}>
                    {renderCell(col, row, rowIndex)}
                  </React.Fragment>
                ))}
              </TableRow>
            ))}

            {enableInfiniteScroll && hasMore && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  <Box sx={{ py: 2 }} />
                </TableCell>
              </TableRow>
            )}

            {!useExternalData && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  <Button
                    startIcon={<Add />}
                    onClick={handleAddRow}
                    variant="outlined"
                    size="small"
                  >
                    新增列
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
                <FormControlLabel
                  key={col.id}
                  control={
                    <Checkbox
                      checked={localDisabledFields.includes(col.id)}
                      onChange={() => handleToggleField(col.id)}
                    />
                  }
                  label={col.label ?? col.id}
                />
              ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>取消</Button>
          <Button
            onClick={handleSaveSettings}
            variant="contained"
            disabled={updateCriteriaMutation.isPending}
          >
            儲存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DynamicFormTable;
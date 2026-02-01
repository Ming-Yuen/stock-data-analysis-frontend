import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Box } from "@mui/material";
import { useMutate } from "../hooks/api/useApi";
import { apiConfig } from "../apiConfig";
import { Column } from "../components/DynamicFormTable/DynamicFormTable.types";
import DynamicFormTable from "../components/DynamicFormTable/DynamicFormTable";
import { MenuTree } from "../services/types/dto/menu";
import { WatchItem, WatchlistEnquiryResponse } from "../services/types/dto/watchlist";

interface WatchListPageProps {
  menuTree: MenuTree;
}

export function WatchListPage({ menuTree }: WatchListPageProps) {
  const [pageSize] = useState(10);
  const [allData, setAllData] = useState<WatchItem[]>([]);
  const [hasMore] = useState(true);

  // ✅ 1. 新增 Ref 用於防止 useEffect 重複執行
  const initializedRef = useRef(false);

  // 用 mutation：只在 Search 时打 API
  const stockSearch = useMutate<WatchlistEnquiryResponse, any>(apiConfig.getWatchList, undefined, {
    onSuccess: (resp) => {
      setAllData(resp.watchItems ?? []);
    },
  });

  const updateWatchList = useMutate<WatchlistEnquiryResponse, any>(apiConfig.updateWatchList);

  const columns: Column[] = useMemo(
    () => [
      {
        id: "watched",
        type: "checkbox",
        label: "Watched",
        width: 140,
        // ✅ 在這裡定義點擊事件
        onChange: (value, row) => {
          // value: true 或 false
          // row: 該行的完整數據
          updateWatchList.mutate({
            figi: row.figi,
            watched: value,
          });
        },
      },
      { id: "symbol", label: "Symbol", width: 200, uppercase: true },
      { id: "quoteDate", type: "date", label: "Quote Date", width: 200, displayDateFormat: "yyyy-MM-dd" },
      { id: "closePrice", type: "number", label: "Close Price", width: 200 },
      { id: "pe", type: "number", label: "PE", width: 200 },
      { id: "rsi", type: "number", label: "RSI", width: 200 },
    ],
    [updateWatchList]
  );

  const handleSearch = useCallback(
    (criteria: Record<string, any>) => {
      const payload = {
        page: 1,
        pageSize,
        criteria, // 来自 DynamicFormTable，已过滤“空值”
      };
      stockSearch.mutate(payload);
    },
    [pageSize, stockSearch]
  );

  // ✅ 2. 修改：使用 initializedRef 防止無限迴圈
  useEffect(() => {
    // 如果已經初始化過，直接返回，不再觸發 API
    if (initializedRef.current) return;

    // 傳入空物件 {} 代表沒有篩選條件，即載入預設列表
    handleSearch({});

    // 標記為已初始化
    initializedRef.current = true;
  }, [handleSearch]);

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
      }}
    >
      <DynamicFormTable pageKey={menuTree.name} title={menuTree.name} columns={columns} data={allData} loading={stockSearch.isPending} error={stockSearch.isError ? (stockSearch.error as any) : null} hasMore={hasMore} enableInfiniteScroll={true} onSearch={handleSearch} />
    </Box>
  );
}

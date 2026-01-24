import React, { useState, useCallback } from "react";
import { Box } from "@mui/material";
import { useMutate } from "../hooks/api/useApi";
import { apiConfig } from "../apiConfig";
import { Column } from "../components/DynamicFormTable/DynamicFormTable.types";
import DynamicFormTable from "../components/DynamicFormTable/DynamicFormTable";
import { MenuTree } from "../services/types/dto/menu";
import { StockSnapshot, StockSnapshotResponse } from "../services/types/dto/stock";

const columns: Column[] = [
  { id: "symbol", label: "Symbol", width: 200 },
  { id: "quoteDate", type: "date", label: "Quote Date", width: 200 },
  { id: "closePrice", type: "number", label: "Close Price", width: 200 },
  { id: "stockPe", type: "number", label: "PE", width: 200 },
];

interface WatchListPageProps {
  menuTree: MenuTree;
}

export function WatchListPage({ menuTree }: WatchListPageProps) {
  const [pageSize] = useState(10);
  const [allData, setAllData] = useState<StockSnapshot[]>([]);
  const [hasMore] = useState(true);

  // 用 mutation：只在 Search 时打 API
  const stockSearch = useMutate<any, any>(apiConfig.getStockSearch, undefined, {
    onSuccess: (resp) => {
      console.log(resp.stockSnapshots);
      setAllData(resp.stockSnapshots ?? []);
    },
  });

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

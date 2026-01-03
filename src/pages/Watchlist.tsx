import React, { useState, useCallback, useEffect } from "react";
import { Box, Button } from "@mui/material";
import { Add } from "@mui/icons-material";
import { useFetch, useMutate } from "../hooks/api/useApi";
import { ApiResponse } from "../services/types/dto/apiResponse";
import { MenuTree } from "../services/types/menu";
import { apiConfig } from "../apiConfig";
import { JobCreatePage } from "./JobCreate";
import { StockSearch, StockSeatchResponse } from "../services/types/dto/stock";
import { Column } from "../components/DynamicFormTable/DynamicFormTable.types";
import DynamicFormTable from "../components/DynamicFormTable/DynamicFormTable";

const columns: Column[] = [
  { id: "symbol", label: "Symbol", width: 200 },
  { id: "quoteDate", label: "Quote Date", width: 200 },
  {
    id: "closePrice",
    label: "Close Price",
    width: 200,
  },
  {
    id: "stockPe",
    label: "PE",
    width: 200,
  },
];

interface WatchListPageProps {
  menuTree: MenuTree;
}

export function WatchListPage({ menuTree }: WatchListPageProps) {
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [allData, setAllData] = useState<StockSearch[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // 使用 useFetch 获取任务列表
  const { data, isLoading, isError, error, refetch } = useFetch<StockSeatchResponse>(apiConfig.getStockSearch, { page, pageSize });

  // 启动任务的 mutation
  const launchBatchJob = useMutate<ApiResponse>(apiConfig.getStockSearch, {
    onSuccess: () => {
      // 成功後重抓目前頁的列表
      console.log("refresh");
      refetch && refetch();
    },
  });
  // 处理创建按钮点击
  const handleCreateClick = () => {
    setShowCreatePage(true);
  };

  // 处理关闭创建页面
  const handleCreateClose = () => {
    setShowCreatePage(false);
    // 重置页面到第一页，触发数据重新加载
    setPage(1);
    // 注意：这里不再立即清空 allData，等待新数据加载
  };

  // 处理数据更新
  useEffect(() => {
    if (data?.stockSearchList) {
      if (page === 1) {
        // 第一页：重置数据
        setAllData(data.stockSearchList);
      } else {
        // 后续页：追加数据
        setAllData((prev) => [...prev, ...data.stockSearchList]);
      }

      // 判断是否还有更多数据
      // const total = data.total || 0;
      // const currentTotal = (page - 1) * pageSize + data.stockSearchList.length;
      // setHasMore(currentTotal < total);
    }
  }, [data, page, pageSize]);

  // 当页面重置为1且不在创建页面时，确保重新获取数据
  useEffect(() => {
    if (page === 1 && !showCreatePage) {
      // 如果 useFetch 支持 refetch，则调用 refetch
      // 否则依赖 page 的变化会自动重新请求
      if (refetch) {
        refetch();
      }
    }
  }, [page, showCreatePage, refetch]);

  // 处理加载更多数据
  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setPage((prev) => prev + 1);
    }
  }, [isLoading, hasMore]);

  // 如果正在显示创建页面，则渲染创建页面
  if (showCreatePage) {
    return <JobCreatePage menuTree={menuTree} onClose={handleCreateClose} />;
  }

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
      {/* 顶部操作栏 */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" color="primary" startIcon={<Add />} onClick={handleCreateClick} sx={{ ml: "auto" }}>
          Create
        </Button>
      </Box>

      {/* 表格组件 */}
      <DynamicFormTable title={menuTree.name} columns={columns} data={allData} loading={isLoading} error={isError ? error : null} hasMore={hasMore} onLoadMore={handleLoadMore} enableInfiniteScroll={true} extraRenderProps={{ launchBatchJob }} />
    </Box>
  );
}

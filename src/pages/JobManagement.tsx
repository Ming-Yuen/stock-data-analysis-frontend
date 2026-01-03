import React, { useState, useCallback, useEffect } from "react";
import { Box, IconButton, Tooltip, Button } from "@mui/material";
import { PlayArrow, Add } from "@mui/icons-material";
import { useFetch, useMutate } from "../hooks/api/useApi";
import { ApiResponse } from "../services/types/dto/apiResponse";
import { Job, EnquiryJobResponse } from "../services/types/dto/batch";
import { apiConfig } from "../apiConfig";
import { ActiveStatus } from "../services/types/enums/ActiveStatus";
import { JobCreatePage } from "./JobCreate";
import { getStatusLabel, JobStatus } from "../services/types/status";
import { Column } from "../components/DynamicFormTable/DynamicFormTable.types";
import DynamicFormTable from "../components/DynamicFormTable/DynamicFormTable";
import { MenuTree } from "../services/types/dto/menu";

const columns: Column[] = [
  { id: "jobName", label: "Task Name", width: 200 },
  { id: "taskGroup", label: "Task Group", width: 200 },
  {
    id: "activeStatus",
    label: "Active",
    width: 120,
    render: (value, row, index) => {
      if (value === ActiveStatus.ACTIVE) {
        return <span style={{ color: "green" }}>Active</span>;
      } else if (value === ActiveStatus.INACTIVE) {
        return <span style={{ color: "red" }}>Inactive</span>;
      }
      return <span style={{ color: "gray" }}>{value || "-"}</span>;
    },
  },
  {
    id: "lastExecutionTime",
    label: "Execute time",
    width: 200,
    type: "date",
    displayDateFormat: "yyyy-MM-dd HH:mm:ss",
  },
  {
    id: "lastExecutionStatus",
    label: "Execute result",
    width: 200,
    render: (value: string, row: Job) => {
      const label = getStatusLabel(JobStatus, value);
      const hint = row.resultMessage; // 或 row.executionResultMessage
      // 没有 message 时就不显示 tooltip，保持简单
      if (!hint) {
        return <span>{label}</span>;
      }

      return (
        <Tooltip title={hint}>
          <span>{label}</span>
        </Tooltip>
      );
    },
  },
  {
    id: "actions",
    label: "Run",
    width: 120,
    isActionColumn: true,
    render: (value, row, index, { launchBatchJob }) => (
      <IconButton
        color="primary"
        size="small"
        onClick={() =>
          launchBatchJob.mutate({
            jobName: row.jobName,
            jobParams: row.jobParams,
            taskGroup: row.taskGroup,
          })
        }
        disabled={launchBatchJob.isPending}
      >
        <PlayArrow />
      </IconButton>
    ),
  },
];

interface JobManagementPageProps {
  menuTree: MenuTree;
}

export function JobManagementPage({ menuTree }: JobManagementPageProps) {
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [allData, setAllData] = useState<Job[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // 使用 useFetch 获取任务列表
  const { data, isLoading, isError, error, refetch } = useFetch<EnquiryJobResponse>(apiConfig.getJobList, { page, pageSize });
  const launchBatchJob = useMutate<ApiResponse>(apiConfig.launchJobList);

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
    if (data?.jobTaskList) {
      if (page === 1) {
        // 第一页：重置数据
        setAllData(data.jobTaskList);
      } else {
        // 后续页：追加数据
        setAllData((prev) => [...prev, ...data.jobTaskList]);
      }

      // 判断是否还有更多数据
      const total = data.total || 0;
      const currentTotal = (page - 1) * pageSize + data.jobTaskList.length;
      setHasMore(currentTotal < total);
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
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
      {/* 顶部操作栏 */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" color="primary" startIcon={<Add />} onClick={handleCreateClick} sx={{ ml: "auto" }}>
          Create
        </Button>
      </Box>

      {/* 表格组件 */}
      <DynamicFormTable pageKey="" title={menuTree.name} columns={columns} data={allData} loading={isLoading} error={isError ? error : null} hasMore={hasMore} onLoadMore={handleLoadMore} enableInfiniteScroll={true} extraRenderProps={{ launchBatchJob }} />
    </Box>
  );
}

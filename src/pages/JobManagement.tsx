import React, { useState, useCallback, useEffect } from "react";
import { Box, Button, IconButton, Tooltip, Stack } from "@mui/material";
import { Add, PlayArrow } from "@mui/icons-material";
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
    type: "select",
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
    type: "datetime",
    displayDateFormat: "yyyy-MM-dd HH:mm:ss",
  },
  {
    id: "lastExecutionStatus",
    label: "Execute result",
    width: 200,
    render: (value: string, row: Job) => {
      const label = getStatusLabel(JobStatus, value);
      const hint = row.resultMessage;
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

  const { data, isLoading, isError, error, refetch } = useFetch<EnquiryJobResponse>(apiConfig.getJobList, { page, pageSize });
  const launchBatchJob = useMutate<ApiResponse>(apiConfig.launchJobList);

  const handleCreateClick = () => {
    setShowCreatePage(true);
  };

  const handleCreateClose = () => {
    setShowCreatePage(false);
    setPage(1);
  };

  useEffect(() => {
    if (data?.jobTaskList) {
      if (page === 1) {
        setAllData(data.jobTaskList);
      } else {
        setAllData((prev) => [...prev, ...data.jobTaskList]);
      }

      const total = data.total || 0;
      const currentTotal = (page - 1) * pageSize + data.jobTaskList.length;
      setHasMore(currentTotal < total);
    }
  }, [data, page, pageSize]);

  useEffect(() => {
    if (page === 1 && !showCreatePage) {
      if (refetch) {
        refetch();
      }
    }
  }, [page, showCreatePage, refetch]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setPage((prev) => prev + 1);
    }
  }, [isLoading, hasMore]);

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
      <DynamicFormTable
        pageKey={menuTree.name}
        title={menuTree.name}
        columns={columns}
        data={allData}
        loading={isLoading}
        error={isError ? error : null}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        enableInfiniteScroll={true}
        extraRenderProps={{ launchBatchJob }}
        toolbarActions={
          // 這裡可以放多個按鈕，用 Stack/Box 包起來
          <Stack direction="row" spacing={1}>
            <Button variant="contained" color="primary" size="small" startIcon={<Add />} onClick={handleCreateClick}>
              Create
            </Button>
            {/* 例子：第二個按鈕，以後要加其他動作可以直接塞這裡 */}
            {/* <Button size="small" variant="outlined">Export</Button> */}
          </Stack>
        }
      />
    </Box>
  );
}

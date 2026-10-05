import React, { useState, useCallback, useEffect, useMemo } from "react";
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
import { useTranslation } from "react-i18next";

interface JobManagementPageProps {
  menuTree: MenuTree;
}

export function JobManagementPage({ menuTree }: JobManagementPageProps) {
  const { t } = useTranslation();
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [allData, setAllData] = useState<Job[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const { data, isLoading, isError, error, refetch } = useFetch<EnquiryJobResponse>(apiConfig.getJobList, { page, pageSize });
  const launchBatchJob = useMutate<ApiResponse>(apiConfig.launchJobList);

  const columns: Column[] = useMemo(() => [
    { id: "jobName", label: t("job.columns.taskName"), width: 200 },
    { id: "taskGroup", label: t("job.columns.taskGroup"), width: 200 },
    {
      id: "activeStatus", label: t("job.columns.active"), type: "select", width: 120,
      render: (value) => value === ActiveStatus.ACTIVE
        ? <span style={{ color: "green" }}>{t("job.status.active")}</span>
        : value === ActiveStatus.INACTIVE
          ? <span style={{ color: "red" }}>{t("job.status.inactive")}</span>
          : <span style={{ color: "gray" }}>{value || "-"}</span>,
    },
    {
      id: "lastExecutionTime", label: t("job.columns.executionTime"), width: 200,
      type: "datetime", displayDateFormat: "yyyy-MM-dd HH:mm:ss",
    },
    {
      id: "lastExecutionStatus", label: t("job.columns.executionResult"), width: 200,
      render: (value: string, row: Job) => {
        const label = t(`job.executionStatus.${value}`, { defaultValue: getStatusLabel(JobStatus, value) });
        return row.resultMessage
          ? <Tooltip title={row.resultMessage}><span>{label}</span></Tooltip>
          : <span>{label}</span>;
      },
    },
    {
      id: "actions", label: t("job.columns.run"), width: 120, isActionColumn: true,
      render: (value, row, index, { launchBatchJob }) => (
        <Tooltip title={t("job.actions.run")}>
          <span>
            <IconButton color="primary" size="small" onClick={() => launchBatchJob.mutate({
              jobName: row.jobName, jobParams: row.jobParams, taskGroup: row.taskGroup,
            })} disabled={launchBatchJob.isPending}>
              <PlayArrow />
            </IconButton>
          </span>
        </Tooltip>
      ),
    },
  ], [t]);

  const handleCreateClick = () => {
    setSelectedJob(null);
    setShowCreatePage(true);
  };

  const handleCreateClose = () => {
    setShowCreatePage(false);
    setSelectedJob(null);
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
    return <JobCreatePage menuTree={menuTree} job={selectedJob ?? undefined} onClose={handleCreateClose} />;
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
        columns={columns}
        data={allData}
        loading={isLoading}
        error={isError ? error : null}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        enableInfiniteScroll={true}
        extraRenderProps={{ launchBatchJob }}
        onRowDoubleClick={(row) => {
          setSelectedJob(row as Job);
          setShowCreatePage(true);
        }}
        toolbarActions={
          // 這裡可以放多個按鈕，用 Stack/Box 包起來
          <Stack direction="row" spacing={1}>
            <Button variant="contained" color="primary" size="small" startIcon={<Add />} onClick={handleCreateClick}>
              {t("job.actions.create")}
            </Button>
            {/* 例子：第二個按鈕，以後要加其他動作可以直接塞這裡 */}
            {/* <Button size="small" variant="outlined">Export</Button> */}
          </Stack>
        }
      />
    </Box>
  );
}

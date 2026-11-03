import React, { useState, useMemo } from "react";
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
import { formatQuartzCronExpression, getFixedQuartzTimeSeconds } from "../utils/cronExpression";

interface JobManagementPageProps {
  menuTree: MenuTree;
}

export function JobManagementPage({ menuTree }: JobManagementPageProps) {
  const { t } = useTranslation();
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const { data, isLoading, isError, error, refetch } = useFetch<EnquiryJobResponse>(apiConfig.getJobList);
  const launchBatchJob = useMutate<ApiResponse>(apiConfig.launchJobList);
  const jobs = useMemo(() => (data?.jobTaskList ?? [])
    .map((job) => ({
      job,
      time: job.taskGroup === "SCHEDULE" && job.activeStatus === ActiveStatus.ACTIVE
        ? getFixedQuartzTimeSeconds(job.cronExpression) ?? Number.MAX_SAFE_INTEGER
        : Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => a.time - b.time || a.job.taskCode.localeCompare(b.job.taskCode))
    .map(({ job }) => job), [data?.jobTaskList]);

  const columns: Column[] = useMemo(() => [
    { id: "taskCode", label: t("job.columns.taskCode"), width: 260 },
    {
      id: "description", label: t("job.columns.description"), width: 380,
      render: (value, row: Job) => t(`job.description.${row.taskCode}`, { defaultValue: "-" }),
    },
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
      id: "cronExpression", label: t("job.columns.scheduleTime"), width: 220,
      render: (value) => formatQuartzCronExpression(value, t),
    },
    {
      id: "lastExecStartTime", label: t("job.columns.lastExecStartTime"), width: 200,
      type: "datetime", displayDateFormat: "yyyy-MM-dd HH:mm:ss",
    },
    {
      id: "lastExecEndTime", label: t("job.columns.lastExecEndTime"), width: 200,
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
              taskCode: row.taskCode, jobParams: row.jobParams, taskGroup: row.taskGroup,
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
    void refetch();
  };

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
        data={jobs}
        loading={isLoading}
        error={isError ? error : null}
        enableInfiniteScroll={false}
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

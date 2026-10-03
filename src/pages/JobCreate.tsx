// pages/JobCreate.tsx
import React from "react";
import Grid from "@mui/material/Grid";
import { Box, Button, TextField, Typography, Paper, Alert, Checkbox, Autocomplete } from "@mui/material";
import { Save, Cancel } from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import { useMutate } from "../hooks/api/useApi";
import { ApiResponse } from "../services/types/dto/apiResponse";
import { Job, TaskGroup } from "../services/types/dto/batch";
import { ActiveStatus } from "../services/types/enums/ActiveStatus";
import { MenuTree } from "../services/types/dto/menu";

interface JobCreatePageProps {
  menuTree: MenuTree;
  job?: Job;
  onClose?: () => void;
}

interface CronSchedule {
  selectedDays: number[];
  startDateTime: string;
  frequency: "daily" | "weekly" | "monthly";
  endDate?: string;
}

interface JobFormData {
  jobName: string;
  taskGroup: TaskGroup | "";
  taskDescription: string;
  jobParams: string;
  jobClassPath: string;
  cronSchedule: CronSchedule;
  activeStatus: ActiveStatus;
}

const FormField = ({ label, required = false, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) => (
  <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
    <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 100, pt: 1, whiteSpace: "nowrap" }}>
      {label}
      {required && <span style={{ color: "#d32f2f", marginLeft: 4 }}>*</span>}
    </Typography>
    <Box sx={{ flex: 1 }}>
      {children}
      {error && (
        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
          {error}
        </Typography>
      )}
    </Box>
  </Box>
);

const scheduleFromJob = (job?: Job): CronSchedule => {
  const parts = job?.cronExpression?.trim().split(/\s+/) ?? [];
  const dayOfMonth = parts[3];
  const dayOfWeek = parts[5];
  const frequency: CronSchedule["frequency"] =
    dayOfWeek && dayOfWeek !== "?" && dayOfWeek !== "*"
      ? "weekly"
      : dayOfMonth === "1"
        ? "monthly"
        : "daily";
  const selectedDays = frequency === "weekly"
    ? dayOfWeek.split(",").map(Number).map((day) => day === 1 ? 0 : day - 1)
    : [];

  const cronTime = parts.length >= 3
    ? `${String(parts[2]).padStart(2, "0")}:${String(parts[1]).padStart(2, "0")}`
    : "12:00";

  return {
    selectedDays,
    startDateTime: job?.startTime?.slice(0, 16) ?? `${new Date().toISOString().slice(0, 10)}T${cronTime}`,
    frequency,
    endDate: job?.endTime?.slice(0, 10) ?? "",
  };
};

export function JobCreatePage({ menuTree, job, onClose }: JobCreatePageProps) {
  const isEditing = Boolean(job);
  // ✅ 使用環境變數配置 API endpoint
  const createJob = useMutate<ApiResponse>({
    url: `${process.env.REACT_APP_API_BASE_URL}/job/update`,
    method: "post",
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<JobFormData>({
    defaultValues: {
      jobName: job?.jobName ?? "",
      taskGroup: job?.taskGroup ?? "",
      taskDescription: job?.taskDescription ?? "",
      jobParams: JSON.stringify(job?.jobParams ?? {}, null, 2),
      jobClassPath: job?.jobClassPath ?? "",
      cronSchedule: scheduleFromJob(job),
      activeStatus: job?.activeStatus ?? ActiveStatus.ACTIVE,
    },
  });

  const frequency = watch("cronSchedule.frequency");
  const selectedDays = watch("cronSchedule.selectedDays");

  const taskGroupOptions: { label: string; value: TaskGroup }[] = [
    // 可以重新啟用這些選項
    { label: "SCHEDULE", value: "SCHEDULE" },
    { label: "BATCH", value: "BATCH" },
    { label: "REPORT", value: "REPORT" },
  ];

  const generateCronExpression = (schedule: CronSchedule): string => {
    if (!schedule.startDateTime) return "";
    const [, time = ""] = schedule.startDateTime.split("T");
    const [hours, minutes] = time.split(":").map(Number);
    if (schedule.frequency === "daily") return `0 ${minutes} ${hours} * * ?`;
    if (schedule.frequency === "weekly") {
      if (schedule.selectedDays.length === 0) return "";
      const quartzDays = schedule.selectedDays.map((day) => (day === 0 ? 1 : day + 1)).join(",");
      return `0 ${minutes} ${hours} ? * ${quartzDays}`;
    }
    if (schedule.frequency === "monthly") return `0 ${minutes} ${hours} 1 * ?`;
    return "";
  };

  const handleDayToggle = (day: number) => {
    const currentDays = [...selectedDays];
    const index = currentDays.indexOf(day);
    if (index > -1) currentDays.splice(index, 1);
    else currentDays.push(day);
    setValue("cronSchedule.selectedDays", currentDays.sort());
  };

  const onSubmit = async (data: JobFormData) => {
    try {
      // 解析 Job Params JSON
      const jobParams = data.jobParams.trim() ? JSON.parse(data.jobParams) : {};

      // Generate the persisted Quartz cron expression.
      const cronExpression = generateCronExpression(data.cronSchedule);

      // ✅ 組裝 POST body
      const submitData = {
        jobName: data.jobName,
        taskGroup: data.taskGroup,
        taskDescription: data.taskDescription, // ✅ 加上 description
        jobClassPath: data.jobClassPath,
        jobParams: jobParams,
        cronExpression,
        startTime: data.cronSchedule.startDateTime
          ? `${data.cronSchedule.startDateTime}:00`
          : null,
        endTime: data.cronSchedule.endDate ? `${data.cronSchedule.endDate}T23:59:59` : null,
        activeStatus: data.activeStatus,
      };

      console.log("Submitting data:", submitData); // ✅ 調試用

      // ✅ 發送 POST 請求到 backend
      const response = await createJob.mutateAsync(submitData as any);

      console.log("Response from backend:", response); // ✅ 調試用

      // 成功後關閉表單
      onClose?.();
    } catch (error) {
      console.error("Creation failed:", error);
      // ✅ 錯誤處理（可以顯示更詳細的錯誤訊息）
      if (error instanceof Error) {
        console.error("Error details:", error.message);
      }
    }
  };

  const handleCancel = () => {
    onClose?.();
  };

  return (
    <Box sx={{ width: "100%", mx: "auto" }}>
      <Typography variant="h5" gutterBottom>
        {isEditing ? "Edit Job" : "Create Job"}
      </Typography>
      {createJob.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Save failed, please try again later
        </Alert>
      )}
      {createJob.isSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Job saved successfully!
        </Alert>
      )}

      {/* 修改这里：去除 Paper 组件的边框 */}
      <Paper elevation={0} sx={{ p: 3, mt: 2, border: "none", boxShadow: "none" }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={2}>
            {/* Task Group */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormField label="Task Group" required error={errors.taskGroup?.message}>
                <Controller
                  name="taskGroup"
                  control={control}
                  rules={{ required: "Please select or enter Task Group" }}
                  render={({ field: { onChange, value, ...field } }) => (
                    <Autocomplete
                      {...field}
                      value={value || null}
                      onChange={(event, newValue) => {
                        onChange(newValue || "");
                      }}
                      freeSolo
                      options={taskGroupOptions.map((option) => option.value)}
                      getOptionLabel={(option) => {
                        const found = taskGroupOptions.find((opt) => opt.value === option);
                        return found ? found.label : option;
                      }}
                      renderInput={(params) => <TextField {...params} error={!!errors.taskGroup} size="small" placeholder="Please select or enter" />}
                    />
                  )}
                />
              </FormField>
            </Grid>

            {/* Task Name */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormField label="Task Name" required error={errors.jobName?.message}>
                <Controller name="jobName" control={control} rules={{ required: "Task name cannot be empty" }} render={({ field }) => <TextField {...field} disabled={isEditing} error={!!errors.jobName} size="small" fullWidth placeholder="Please enter task name" />} />
              </FormField>
            </Grid>

            {/* Task Description */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormField label="Description">
                <Controller name="taskDescription" control={control} render={({ field }) => <TextField {...field} size="small" fullWidth placeholder="Please enter task description" />} />
              </FormField>
            </Grid>

            {/* Job Class Path - 现在只占一格 */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormField label="Job Path" required error={errors.jobClassPath?.message}>
                <Controller name="jobClassPath" control={control} rules={{ required: "Job Class Path cannot be empty" }} render={({ field }) => <TextField {...field} error={!!errors.jobClassPath} size="small" fullWidth placeholder="e.g. com.example.jobs.MyJobClass" />} />
              </FormField>
            </Grid>

            {/* Status - 现在与 Job Class Path 在同一行 */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FormField label="Status">
                <Controller
                  name="activeStatus"
                  control={control}
                  render={({ field }) => (
                    <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
                      <Checkbox checked={field.value === ActiveStatus.ACTIVE} onChange={(e) => field.onChange(e.target.checked ? ActiveStatus.ACTIVE : ActiveStatus.INACTIVE)} />
                      <Typography variant="body2">Active</Typography>
                    </Box>
                  )}
                />
              </FormField>
            </Grid>

            {/* Job Params */}
            <Grid size={12}>
              <FormField label="Job Params" error={errors.jobParams?.message}>
                <Controller
                  name="jobParams"
                  control={control}
                  rules={{
                    validate: (value) => {
                      if (value.trim()) {
                        try {
                          JSON.parse(value);
                          return true;
                        } catch {
                          return "Please enter valid JSON format";
                        }
                      }
                      return true;
                    },
                  }}
                  render={({ field }) => (
                    <>
                      <TextField {...field} error={!!errors.jobParams} multiline rows={3} fullWidth placeholder='{"key": "value"}' />
                      {!errors.jobParams && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                          Please enter parameters in JSON format
                        </Typography>
                      )}
                    </>
                  )}
                />
              </FormField>
            </Grid>

            {/* Frequency */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormField label="Frequency" required error={errors.cronSchedule?.frequency?.message}>
                <Controller
                  name="cronSchedule.frequency"
                  control={control}
                  rules={{ required: "Please select execution frequency" }}
                  render={({ field }) => (
                    <Autocomplete
                      value={field.value}
                      onChange={(event, newValue) => {
                        field.onChange(newValue || "daily");
                      }}
                      options={["daily", "weekly", "monthly"]}
                      getOptionLabel={(option) => {
                        if (option === "daily") return "Daily";
                        if (option === "weekly") return "Weekly";
                        if (option === "monthly") return "Monthly";
                        return option;
                      }}
                      renderInput={(params) => <TextField {...params} error={!!errors.cronSchedule?.frequency} size="small" />}
                    />
                  )}
                />
              </FormField>
            </Grid>

            {/* Start Date Time */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormField label="Start Date Time" required error={errors.cronSchedule?.startDateTime?.message}>
                <Controller name="cronSchedule.startDateTime" control={control} rules={{ required: "Please select start date and time" }} render={({ field }) => <TextField {...field} type="datetime-local" slotProps={{ inputLabel: { shrink: true } }} size="small" fullWidth error={!!errors.cronSchedule?.startDateTime} />} />
              </FormField>
            </Grid>

            {/* End Date */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormField label="End Date (Optional)">
                <Controller name="cronSchedule.endDate" control={control} render={({ field }) => <TextField {...field} type="date" slotProps={{ inputLabel: { shrink: true } }} size="small" fullWidth />} />
              </FormField>
            </Grid>

            {/* Select Days */}
            {frequency === "weekly" && (
              <Grid size={12}>
                <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 100, pt: 0.5 }}>
                    Select Days
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", flex: 1 }}>
                    {[
                      { label: "Sun", value: 0 },
                      { label: "Mon", value: 1 },
                      { label: "Tue", value: 2 },
                      { label: "Wed", value: 3 },
                      { label: "Thu", value: 4 },
                      { label: "Fri", value: 5 },
                      { label: "Sat", value: 6 },
                    ].map((day) => (
                      <Box key={day.value} sx={{ display: "flex", alignItems: "center", border: "1px solid #e0e0e0", borderRadius: 1, px: 1.5, py: 0.5, cursor: "pointer", bgcolor: selectedDays.includes(day.value) ? "#e3f2fd" : "transparent", "&:hover": { bgcolor: selectedDays.includes(day.value) ? "#bbdefb" : "#f5f5f5" } }} onClick={() => handleDayToggle(day.value)}>
                        <Checkbox checked={selectedDays.includes(day.value)} size="small" sx={{ p: 0, mr: 0.5 }} />
                        <Typography variant="body2">{day.label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Grid>
            )}

            {/* Buttons */}
            <Grid size={12}>
              <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", pt: 2, borderTop: "1px solid #e0e0e0" }}>
                <Button variant="outlined" startIcon={<Cancel />} onClick={handleCancel} disabled={createJob.isPending}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" color="primary" startIcon={<Save />} disabled={createJob.isPending}>
                  {createJob.isPending ? "Saving..." : "Save"}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
}

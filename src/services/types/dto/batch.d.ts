import { ApiResponse } from "./apiResponse";

export interface LaunchJobRequest<T> {
  jobName: string;
  config: T;
}

export interface EnquiryJobRequest extends Record<string, unknown> {
  jobName: string;
  page?: number;
  pageSize?: number;
}

export type TaskGroup = "TEMP" | "SCHEDULE" | "BATCH" | "REPORT";

export interface Job {
  jobName: string;
  taskGroup: TaskGroup;
  jobParams: { [key: string]: any };
  taskDescription: string;
  jobClassPath: string;
  cronExpression: string;
  startTime?: string;
  endTime?: string;
  activeStatus: ActiveStatus;
  lastExecutionStatus: string;
  lastExecutionTime: string;
  resultMessage: string;
}

export interface EnquiryJobResponse extends ApiResponse {
  jobTaskList: Job[];
  total: number;
  page: number;
  pageSize: number;
}

import { ApiResponse } from "./apiResponse";
import { ActiveStatus } from "../enums/ActiveStatus";

export type TaskGroup = "TEMP" | "SCHEDULE" | "BATCH" | "REPORT";

export interface LaunchJobRequest<T> {
  taskCode: string;
  jobParams: T;
  taskGroup: TaskGroup;
}

export interface EnquiryJobRequest extends Record<string, unknown> {
  taskCode?: string;
  page?: number;
  pageSize?: number;
}

export interface Job {
  id: number;
  taskCode: string;
  taskGroup: TaskGroup;
  jobParams: { [key: string]: any };
  jobClassPath: string;
  cronExpression: string;
  startTime?: string;
  endTime?: string;
  activeStatus: ActiveStatus;
}

export interface EnquiryJobResponse extends ApiResponse {
  jobTaskList: Job[];
}

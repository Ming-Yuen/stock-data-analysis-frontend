import { apiClient } from "./apiClient";
import { apiConfig } from "../apiConfig";
import { ApiResponse } from "./types/dto/apiResponse";
import { EnquiryJobResponse, Job } from "./types/dto/batch";
import { IndustryValuationApproval, IndustryValuationReview } from "./types/dto/industryValuation";

const base = (code: string) => `industry-valuation/${encodeURIComponent(code)}`;

export const industryValuationApi = {
  async review(code: string): Promise<IndustryValuationReview> {
    return (await apiClient.get<IndustryValuationReview>(base(code))).data;
  },
  async propose(code: string): Promise<IndustryValuationReview> {
    return (await apiClient.post<IndustryValuationReview>(`${base(code)}/proposals`)).data;
  },
  async approve(code: string, id: string): Promise<IndustryValuationApproval> {
    return (await apiClient.post<IndustryValuationApproval>(`${base(code)}/proposals/${encodeURIComponent(id)}/approve`)).data;
  },
  async job(taskCode: string): Promise<Job | null> {
    const { data } = await apiClient.post<EnquiryJobResponse>(apiConfig.getJobList.url, {});
    if (data.success === false) throw new Error(data.message);
    return data.jobTaskList.find((job) => job.taskCode === taskCode) ?? null;
  },
  async recalculate(job: Job, figi: string): Promise<void> {
    const { data } = await apiClient.post<ApiResponse>(apiConfig.launchJobList.url, {
      taskCode: job.taskCode, taskGroup: job.taskGroup, jobParams: { figis: figi },
    });
    if (data.success === false) throw new Error(data.message);
  },
};

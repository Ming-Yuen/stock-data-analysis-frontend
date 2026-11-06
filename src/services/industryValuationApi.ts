import { apiClient } from "./apiClient";
import { IndustryValuationDraft, IndustryValuationReview, IndustryValuationUpdate } from "./types/dto/industryValuation";
import { ValuationResult } from "./types/dto/valuation";

const base = (code: string) => "industry-valuation/" + encodeURIComponent(code);

export const industryValuationApi = {
  async review(code: string): Promise<IndustryValuationReview> {
    return (await apiClient.get<IndustryValuationReview>(base(code))).data;
  },
  async propose(code: string): Promise<IndustryValuationDraft> {
    // AI 請求使用後端的 deadline；不把通用 100 秒超時誤認為草稿失敗。
    return (await apiClient.post<IndustryValuationDraft>(base(code) + "/proposals", undefined, { timeout: 0 })).data;
  },
  async save(code: string, input: IndustryValuationUpdate): Promise<IndustryValuationReview> {
    return (await apiClient.put<IndustryValuationReview>(base(code) + "/config", input)).data;
  },
  async recalculate(figi: string, valuationDate: string): Promise<ValuationResult[]> {
    return (await apiClient.post<ValuationResult[]>("valuation/recalculate", { figi, from: valuationDate, through: valuationDate })).data;
  },
};

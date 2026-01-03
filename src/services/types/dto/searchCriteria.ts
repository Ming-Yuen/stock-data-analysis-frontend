import { ApiResponse } from "./apiResponse";

export type SearchCriteriaConfigRequest = {
  pageKey: string;
};
export interface SearchCriteriaConfigResponse extends ApiResponse {
  disabledFields: string[];
}
export type UpdateCriteriaConfigRequest = {
  pageKey: string;
  disabledFields: string[];
};
export interface UpdateCriteriaConfigResponse extends ApiResponse {}

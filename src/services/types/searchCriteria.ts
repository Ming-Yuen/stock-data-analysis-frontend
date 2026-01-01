import { ApiResponse } from "../../hooks/api";

export interface SearchCriteriaConfigRequest {
  pageKey: string;
}
export interface SearchCriteriaConfigResponse extends ApiResponse {
  disabledFields: string[];
}
export interface UpdateCriteriaConfigRequest {
  pageKey: string;
  disabledFields: string[];
}
export interface UpdateCriteriaConfigResponse extends ApiResponse {}

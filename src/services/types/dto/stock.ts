import { ApiResponse } from "./apiResponse";

export interface StockSeatchResponse extends ApiResponse {
  stockSearchList: StockSearch[];
}

export interface StockSearch {
  symbol: string;
  quoteDate: string;
  closePrice: number;
  stockPe: number;
}

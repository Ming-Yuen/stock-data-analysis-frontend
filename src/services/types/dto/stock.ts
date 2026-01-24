import { ApiResponse } from "./apiResponse";

export interface StockSnapshotResponse extends ApiResponse {
  stockSnapshots: StockSnapshot[];
}

export interface StockSnapshot {
  symbol: string;
  quoteDate: string;
  closePrice: number;
  stockPe: number;
}

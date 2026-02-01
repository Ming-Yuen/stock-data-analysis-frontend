import { ApiResponse } from "./apiResponse";

export interface StockSnapshotResponse extends ApiResponse {
  stockSnapshots: StockSnapshot[];
}

export interface StockSnapshot {
  figi: string;
  symbol: string;
  quoteDate: string;
  closePrice: number;
  pe: number;
  peg: number;
  rsi: number;
}

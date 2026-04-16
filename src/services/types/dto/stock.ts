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
  cashPerShare: number;
}

// export interface StockClassification {
//   industry: string;
//   category: string;
//   subCategory: string;
// }

// export interface StockClassificationResponse {
//   stockClassifications: StockClassification[];
// }

export interface StockClassificationTree {
  industry: string;
  categories: {
    category: string;
    subCategories: string[];
  }[];
}

export interface StockClassificationResponse {
  stockClassificationTrees: StockClassificationTree[];
}
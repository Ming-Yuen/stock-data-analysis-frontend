import { ApiResponse } from "./apiResponse";

export interface StockSnapshotResponse extends ApiResponse {
  stockSnapshots: StockSnapshot[];
}

export interface StockSnapshot {
  figi: string;
  symbol: string;
  quoteDate: string;
  closePrice: number;
  stockType: string;
  pe: number;
  peg: number;
  rsi: number;
  cashPerShare: number;
  earningsPerShareTtm?: number | null;
  fundamentalAsOfDate?: string;
  latestFilingDate?: string;
  fiscalYear?: number;
  fiscalPeriod?: string;
  nextEarningsDate?: string;
  industry?: string;
  category?: string;
  subCategory?: string;
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

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
  rsi7?: number | null;
  rsi14?: number | null;
  rsi21?: number | null;
  cashPerShare: number;
  debtPerShare?: number | null;
  netCashPerShare?: number | null;
  cashLikeAssetsPerShare?: number | null;
  netCashForValuationPerShare?: number | null;
  earningsPerShareTtm?: number | null;
  fundamentalAsOfDate?: string;
  latestFilingDate?: string;
  fiscalYear?: number;
  fiscalPeriod?: string;
  epsCalculationMethod?: string;
  nextEarningsDate?: string;
  postFilingEventDate?: string;
  postFilingEventSubtype?: string;
  postFilingEventTitle?: string;
  postFilingEventDescription?: string;
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

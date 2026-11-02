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
  industryCode?: string | null;
  industry?: string | null;
  concepts: StockConcept[];
}

export interface StockClassification {
  code: string;
  industry: string;
  primaryValuationMetric?: string | null;
}

export interface StockConcept {
  code: string;
  name: string;
}

export interface StockClassificationResponse {
  classifications: StockClassification[];
  concepts: StockConcept[];
}

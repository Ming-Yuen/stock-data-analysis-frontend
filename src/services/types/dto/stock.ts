export interface StockConcept { code: string; name: string; }

export interface StockClassification {
  code: string;
  industry: string;
  futuPlateCode: string | null;
}

export interface StockClassificationResponse {
  classifications: StockClassification[];
  concepts: StockConcept[];
}

export interface StockScreenItem {
  figi: string;
  symbol: string;
  name: string;
  stockType: string;
  industryCode: string | null;
  industry: string | null;
  concepts: StockConcept[];
  quoteDate: string | null;
  closePrice: number | null;
  valuationDate: string | null;
  pe: number | null;
  pb: number | null;
  ps: number | null;
  pfcf: number | null;
  evEbitda: number | null;
  status: string | null;
  reasonCode: string | null;
}

export interface StockScreenResponse {
  items: StockScreenItem[];
  total: number;
  page: number;
  size: number;
}

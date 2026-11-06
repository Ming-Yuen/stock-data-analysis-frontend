export interface ValuationMetric {
  value: number | null;
  status: string;
  reasonCode: string | null;
}

export interface ValuationReference {
  kind: "HISTORICAL_MARKET" | "PEER_MARKET" | "INDUSTRY_ASSUMPTION";
  metricCode: string | null;
  status: string;
  reasonCode: string | null;
  multipleLow: number | null;
  multipleMedian: number | null;
  multipleHigh: number | null;
  priceLow: number | null;
  priceHigh: number | null;
  sampleCount: number | null;
}

export interface ValuationResult {
  figi: string;
  valuationDate: string;
  analysisAsOf: string;
  calculatedAt: string;
  currency: string | null;
  price: number | null;
  industryCode: string | null;
  modelCode: string | null;
  primaryMetric: string | null;
  status: string;
  reasonCode: string | null;
  metrics: { pe: ValuationMetric; pb: ValuationMetric; ps: ValuationMetric; pfcf: ValuationMetric; evEbitda: ValuationMetric };
  historicalReference: ValuationReference | null;
  peerReference: ValuationReference | null;
  industryAssumption: ValuationReference | null;
}

export interface FinancialValue {
  value: number | null;
  status: string;
  reasonCode: string | null;
  calculation: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  availableAt: string | null;
}

export interface Financials {
  periodEnd: string | null;
  availableAt: string | null;
  reportingCurrency: string | null;
  revenueTtm: FinancialValue;
  netIncomeCommonTtm: FinancialValue;
  epsTtm: FinancialValue;
  operatingCashFlowTtm: FinancialValue;
  capitalExpenditureTtm: FinancialValue;
  freeCashFlowTtm: FinancialValue;
  ebitdaTtm: FinancialValue;
  commonEquity: FinancialValue;
  sharesOutstanding: FinancialValue;
  bookValuePerShare: FinancialValue;
  totalDebt: FinancialValue;
  cashLikeAssets: FinancialValue;
  preferredEquity: FinancialValue;
  noncontrollingInterest: FinancialValue;
}
